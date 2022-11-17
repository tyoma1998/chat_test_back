const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").Server(app);
const io = require("socket.io")(server, { cors: { origins: "*" } });

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://chat-test-task-fron.herokuapp.com",
  ],
};

// const corsOpts = {
//   origin: "*",

//   methods: ["GET", "POST"],

//   allowedHeaders: ["Content-Type"],
// };

// app.use(cors(corsOpts));
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

const rooms = new Map();

app.get("/rooms/:id", cors(corsOptions), (req, res) => {
  const { id: roomId } = req.params;
  const obj = rooms.has(roomId)
    ? {
        users: [...(rooms.get(roomId).get("users")?.values() || [])],
        messages: [...(rooms.get(roomId)?.get("messages")?.values() || [])],
      }
    : { users: [], messages: [] };

  res.json(obj);
});

app.post("/rooms", cors(corsOptions), (req, res) => {
  const { roomId, userName } = req.body;
  if (!rooms.has(roomId)) {
    rooms.set(
      roomId,
      new Map([
        ["users", new Map()],
        ["messages", []],
      ])
    );
  }
  res.json([...rooms.values()]);
});

io.on("connection", (socket) => {
  socket.on("ROOM:JOIN", ({ roomId, userName }) => {
    socket.join(roomId);
    rooms.get(roomId).get("users").set(socket.id, userName);
    const users = [...rooms.get(roomId).get("users").values()];
    socket.to(roomId).emit("ROOM:SET_USERS", users);
  });

  socket.on("ROOM:NEW_MESSAGE", ({ roomId, userName, text }) => {
    const obj = {
      userName,
      text,
    };
    rooms.get(roomId).get("messages").push(obj);
    const messages = rooms.get(roomId).get("messages");
    socket.to(roomId).emit("ROOM:NEW_MESSAGE", messages);
  });

  io.on("disconnected", () => {
    rooms.forEach((value, roomId) => {
      if (value.get("users").delete(socket.id)) {
        const users = [...value.get("users").values()];
        socket.to(roomId).broadcast.emit("ROOM:SET_USERS", users);
      }
    });
  });
});

server.listen(process.env.PORT || 8000, (err) => {
  if (err) {
    throw Error(err);
  }
  console.log("Запуск");
});
