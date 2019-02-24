/////////////////////////////////////////////////////////////////
// Init app

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static(__dirname + "/public"));

/////////////////////////////////////////////////////////////////
// Data module

const SCORES_TO_WIN = 50;

let firstUser = null;
let secondUser = null;
let gameStarted = false;

const createUser = id => ({
  id,
  overallScore: 0,
  currentScore: 0
});

/////////////////////////////////////////////////////////////////
// Socket module

io.on("connection", user => {
  let timeConnected = Date.now();

  if (!firstUser) {
    firstUser = createUser(timeConnected);
    user.emit("firstCreated", timeConnected);
    console.log("First user connected");
  } else if (!secondUser) {
    secondUser = createUser(timeConnected);
    user.emit("secondCreated", timeConnected);
    io.emit("secondJoined");
    console.log("Second user connected");
  } else {
    user.emit("noPlaces");
  }

  user.on("gameStarted", () => {
    gameStarted = true;
    console.log(`game started between ${firstUser.id} and ${secondUser.id}`);
    io.emit("startGame");
  });

  user.on("turnEnded", ({ playerNumber, overallScore, currentScore }) => {
    if (playerNumber == 1) {
      firstUser.overallScore += overallScore;
      firstUser.currentScore = currentScore;
      io.emit("turnFirstOver", currentScore);
    } else if (playerNumber == 2) {
      secondUser.overallScore += overallScore;
      secondUser.currentScore = currentScore;
      io.emit("turnSecondOver", currentScore);
    } else {
      throw new Error("Invalid player number!" + playerNumber);
    }

    if (overallScore >= SCORES_TO_WIN) {
      gameStarted = false;
      firstUser = null;
      secondUser = null;
      io.emit("gameOver", playerNumber);
    }
  });

  user.on("disconnect", () => {
    if (gameStarted) {
      firstUser = null;
      secondUser = null;
      io.emit("exitGame");
    } else if (firstUser && firstUser.id == timeConnected) {
      io.emit("firstLeaved");
      console.log("First user disconnected");
      firstUser = secondUser;
      secondUser = null;
    } else if (secondUser && secondUser.id == timeConnected) {
      console.log("Second user disconnected");
      io.emit("secondLeaved");
      secondUser = null;
    } else {
      console.log(`${timeConnected} disconnected`);
    }
  });
});

/////////////////////////////////////////////////////////////////
// Run app

const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Server started on port ${port}`));

/////////////////////////////////////////////////////////////////
