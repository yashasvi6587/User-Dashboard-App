const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usermodel = require("./models/user");
const postmodel = require("./models/post");
const upload = require("./config/multerconfig")
const path = require("path")

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")))
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Step - 1
app.post("/register", async (req, res) => {
  let existinguser = await usermodel.findOne({ email: req.body.email });
  if (existinguser) return res.status(500).send("User already registered");
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(req.body.password, salt, async (err, hash) => {
      let user = await usermodel.create({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        age: req.body.age,
        password: hash,
      });
      let token = jwt.sign(
        { email: req.body.email, userid: user._id },
        "secreter"
      );
      res.cookie("token", token);
      res.redirect("/login")
    });
  });
});

// Step - 2
app.post("/login", async (req, res) => {
  try {
    const existinguser = await usermodel.findOne({ email: req.body.email });

    // Email not found
    if (!existinguser) {
      return res.redirect("/login?error=email");
    }

    // Compare password
    bcrypt.compare(req.body.password, existinguser.password, (err, result) => {
      if (err || !result) {
        // Password incorrect
        return res.redirect("/login?error=password");
      }

      // Correct credentials — create token and redirect
      const token = jwt.sign(
        { email: req.body.email, userid: existinguser._id },
        "secreter"
      );

      res.cookie("token", token);
      res.redirect("/profile");
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Step - 3
app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

// Step - 5
// Middleware for protected route like befor going to profile page user should have to login first
function loginfirst(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, "secreter");
    req.user = data;
    next();
  }
}

// Step - 6
app.get("/profile", loginfirst, async (req, res) => {
  let user = await usermodel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user });
});

// Step - 7
app.post("/post", loginfirst, async (req, res) => {
  let user = await usermodel.findOne({ email: req.user.email });
  let post = await postmodel.create({
    user: user._id,
    content: req.body.content,
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

// Step - 8
app.post("/like/:id", loginfirst, async (req, res) => {
  try {
    const post = await postmodel.findById(req.params.id).populate("user");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = req.user.userid;
    let liked = false;

    // Toggle like
    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId);
      liked = true;
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();

    res.json({
      liked,
      likeCount: post.likes.length
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// Step - 10
app.get("/edit/:id", loginfirst, async (req, res) => {
  let post = await postmodel.findOne({ _id: req.params.id }).populate("user");
  res.render("editpost", { post });
});

// Step - 11
app.post("/update/:id", loginfirst, async (req, res) => {
  let post = await postmodel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );
  res.redirect("/profile");
});

// Step - 12
app.get("/profile/upload" , (req,res) => {
    res.render("uploadprofile")
})

// Step - 13
app.post("/upload", loginfirst , upload.single("image") , async(req,res) => {
    let user = await usermodel.findOne({email:req.user.email})
    user.profilepic = req.file.filename
    await user.save()
    res.redirect("/profile")
})

app.listen(3001);
