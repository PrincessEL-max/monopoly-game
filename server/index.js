const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let players = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);
  socket.on("syncGameState", (gameState) => {

    socket.broadcast.emit("gameStateUpdate", gameState);

  });


  players[socket.id] = {
    id: socket.id,
    position: 0,
  };

  io.emit("playersUpdate", players);

  socket.on("movePlayer", (data) => {
    players[socket.id].position = data.position;

    io.emit("playersUpdate", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];

    io.emit("playersUpdate", players);

    console.log("Player disconnected");
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});