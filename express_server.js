const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const request = require("request");
const cookieParser = require("cookie-parser");
const urlDatabase = require("./db/urlDatabase");
const users = require("./db/user");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");
// -------------------------------------------------
const updateLongUrl = (shortURL, content) => {
  urlDatabase[shortURL] = content;
};
const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

const registrationExist = (email, users) => {
  for (let user in users) {
    if (users[user].email === email) {
      return users[user];
    }
  }
  return false;
};

const authenticateUser = (email, password) => {
  const user = registrationExist(email, users);
  if (user.password === password) {
    return true;
  }
  return false;
};

// -------------------------------------------------
app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = req.cookies["email"];
  const templateVars = {
    userId,
    urls: urlDatabase,
    email,
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = req.cookies["email"];
  const templateVars = {
    userId,
    email,
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = req.cookies["email"];
  const templateVars = {
    userId,
    email,
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  request(longURL, (error, response, body) => {
    if (error) {
      res.render("404");
    } else if (response.statusCode === 200) {
      res.redirect(longURL);
    }
  });
});

app.get("/login", (req, res) => {
  const templateVars = {
    userId: null,
    email: null,
  };
  res.render("urls_login", templateVars);
});

app.get("/register", (req, res) => {
  const templateVars = {
    userId: null,
    email: null,
  };
  res.render("urls_register", templateVars);
});

// -------------------------------------------------
app.post("/register", (req, res) => {
  const user_id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const user = registrationExist(email, users);
  if (!email || !password) {
    res.status(400).send("Email/Password can not be empty");
  } else if (user) {
    res.status(400).send("User is already registered!");
  }
  users[user_id] = {
    id: user_id,
    email,
    password,
  };
  console.log(users);
  res.cookie("user_id", user_id).cookie("email", email).redirect("/urls");
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = registrationExist(email, users);
  if (!user) {
    res
      .status(403)
      .send("Email does not exist! Please enter an valid email address");
  } else if (!authenticateUser(email, password)) {
    res.status(403).send("Please enter a correct password!");
  }
  res.cookie("user_id", user.id).cookie("email", email).redirect("/urls");
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const content = req.body.longURL;
  updateLongUrl(shortURL, content);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id").clearCookie("email");
  const templateVars = {
    userId: null,
    urls: urlDatabase,
    email: null,
  };
  res.render("urls_index", templateVars);
});

// -------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
