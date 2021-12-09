const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const request = require("request");
const cookieParser = require("cookie-parser");
const users = require("./db/user");
const urlDatabase = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");
// -------------------------------------------------
const updateLongUrl = (shortURL, content) => {
  urlDatabase[shortURL].longURL = content;
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

const urlFinder = (userId, urlDatabase) => {
  let urls = {};
  for (let elem in urlDatabase) {
    if (urlDatabase[elem].userId === userId) {
      urls[elem] = urlDatabase[elem];
    }
  }
  return urls;
};

// -------------------------------------------------
app.get("/", (req, res) => {
  const userId = req.cookies["user_id"];
  if (userId) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = req.cookies["email"];
  const urls = userId ? urlFinder(userId, urlDatabase) : null;
  const templateVars = {
    userId,
    email,
    urls,
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
  if (userId) {
    return res.render("urls_new", templateVars);
  }
  res.redirect("/login");
});

app.get("/urls/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = req.cookies["email"];
  const shortURL = req.params.id;
  if (!userId) {
    return res.status(400).send("Please Login first");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(403).send("Can not access to this URL");
  }
  const templateVars = {
    userId,
    email,
    shortURL,
    longURL: urlDatabase[shortURL].longURL,
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  const shortURL = req.params.id;
  if (!userId) {
    return es.status(400).send("Please Login first");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(403).send("Can not access to this URL");
  }
  const longURL = urlDatabase[shortURL].longURL;
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
    return res.status(400).send("Email/Password can not be empty");
  } else if (user) {
    return res.status(400).send("User is already registered!");
  }
  users[user_id] = {
    id: user_id,
    email,
    password,
  };
  res.cookie("user_id", user_id).cookie("email", email).redirect("/urls");
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = registrationExist(email, users);
  if (!user) {
    return res
      .status(403)
      .send("Email does not exist! Please enter an valid email address");
  } else if (!authenticateUser(email, password)) {
    return res.status(403).send("Please enter a correct password!");
  }
  res.cookie("user_id", user.id).cookie("email", email).redirect("/urls");
});

app.post("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res
      .status(403)
      .send("Can not edit this page if you are not login!\n");
  }
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = {
    longURL,
    userId,
  };
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  const userId = req.cookies["user_id"];
  const shortURL = req.params.id;

  if (!userId) {
    return res
      .status(403)
      .send("Can not delete this URL if you are not login!\n");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(403).send("You can not delete other user's URL");
  }

  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  const shortURL = req.params.id;

  if (!userId) {
    return res
      .status(403)
      .send("Can not edit this URL if you are not login!\n");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(403).send("You can not modify other user's URL");
  }

  const content = req.body.longURL;
  updateLongUrl(shortURL, content);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id").clearCookie("email");
  res.redirect("/urls");
});

// -------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
