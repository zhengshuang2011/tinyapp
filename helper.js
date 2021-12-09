const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

const getUserByEmail = (email, database) => {
  for (let user_id in database) {
    if (database[user_id].email === email) {
      return user_id;
    }
  }
  return undefined;
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

module.exports = {
  getUserByEmail,
  urlFinder,
  generateRandomString,
};
