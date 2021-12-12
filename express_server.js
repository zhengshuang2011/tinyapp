const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const request = require("request");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");

const urlDatabase = {};
const users = {};
const { getUserByEmail, urlFinder, generateRandomString } = require("./helper");

app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"],
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

/*Below are get routers */

app.get("/", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    res.redirect("/urls"); /* Redirect the user to /urls if user is logged in */
  } else {
    res.redirect(
      "/login"
    ); /* Redirect the user to /login if user is not logged in */
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const email = userId ? users[userId].email : null;
  const urls = userId ? urlFinder(userId, urlDatabase) : null;
  const templateVars = {
    userId,
    email,
    urls,
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  const email = userId ? users[userId].email : null;
  const templateVars = {
    userId,
    email,
  };
  if (userId) {
    return res.render(
      "urls_new",
      templateVars
    ); /* Redirect the user to /urls/new showing shortURL and the corresponding longURL if user created a new one */
  }
  res.redirect(
    "/login"
  ); /* Redirect the user to /login if user is not logged in */
});

app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const email = userId ? users[userId].email : null;
  const shortURL = req.params.id;

  /* If the user is not logged in */
  /* or the user enter the shrotURL which was not created by him */
  /* or the shortURL is invaild, returns HTML with a relevant error message */
  if (!userId) {
    return res.status(400).send("Please Login first");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(401).send("Can not access to this URL");
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
  const userId = req.session.user_id;
  const shortURL = req.params.id;

  /* If the shortURL is invaild, returns HTML with a relevant error message */
  if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  }

  const longURL = urlDatabase[shortURL].longURL;

  request(longURL, (error, response, body) => {
    if (error) {
      res.render(
        "404"
      ); /* Shows 404 not Found if the corresponding longURL is invalid */
    } else if (response.statusCode === 200) {
      res.redirect(
        longURL
      ); /* Redirect the user to /longURL when the user click shortURL */
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

/*Below are post routers */
app.post("/register", (req, res) => {
  const user_id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const userId = getUserByEmail(email, users);

  /* If the user does not enter the password or email address */
  /* If the user already registered! */
  /* returns HTML with a relevant error message  */
  if (!email || !password) {
    return res.status(400).send("Email/Password can not be empty");
  } else if (userId) {
    return res.status(400).send("User is already registered!");
  }

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      users[user_id] = {
        id: user_id,
        email,
        password: hash,
      };
      req.session.user_id = user_id;
      res.redirect(
        "/urls"
      ); /* Redirect the user to /urls after the user register */
    });
  });
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userId = getUserByEmail(email, users);

  /* If the user have not registered yet */
  /* returns HTML with a relevant error message  */
  if (!userId) {
    return res
      .status(403)
      .send("Email does not exist! Please enter an valid email address");
  }

  /* If the user enters the wrong password */
  /* returns HTML with a relevant error message  */
  bcrypt.compare(password, users[userId].password, (err, success) => {
    if (!success) {
      return res.status(403).send("Please enter a correct password!");
    }
    req.session.user_id = users[userId].id;
    res.redirect(
      "/urls"
    ); /* Redirect the user to /longURL after the user login */
  });
});

app.post("/urls", (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res
      .status(401)
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
  const userId = req.session.user_id;
  const shortURL = req.params.id;

  /* If the user is not logged in */
  /* or the user enter the shrotURL which was not created by him */
  /* or the shortURL is invaild, the user can not delete the shortURL, and returns HTML with a relevant error message */
  if (!userId) {
    return res
      .status(401)
      .send("Can not delete this URL if you are not login!\n");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(401).send("You can not delete other user's URL");
  }

  delete urlDatabase[shortURL];
  res.redirect(
    "/urls"
  ); /*Redirect to /urls after the user delete the shortURL */
});

app.post("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const shortURL = req.params.id;

  /* If the user is not logged in */
  /* or the user enter the shrotURL which was not created by him */
  /* or the shortURL is invaild, the user can not update the shortURL, and returns HTML with a relevant error message */
  if (!userId) {
    return res
      .status(401)
      .send("Can not edit this URL if you are not login!\n");
  } else if (!Object.keys(urlDatabase).includes(shortURL)) {
    return res.status(403).send("Failed, this short URL has not been created.");
  } else if (userId !== urlDatabase[shortURL].userId) {
    return res.status(401).send("You can not modify other user's URL");
  }

  const content = req.body.longURL;
  urlDatabase[shortURL].longURL = content;
  res.redirect(
    "/urls"
  ); /*Redirect to /urls after the user update the longURL */
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

// -------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
