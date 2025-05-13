require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const DB_CONN_STRING = process.env.MONGO_URI;

const auth = require("./auth");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { UserModel, TodoModel } = require("./db");
const app = express();
app.use(express.json());

async function connectDB() {
  try {
    await mongoose.connect(DB_CONN_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1); // Exit app if DB connection fails
  }
}

// Start server after DB connection
connectDB().then(() => {
  app.listen(3000, () => {
    console.log(`🚀 Server running on port ${3000}`);
  });
});


app.post("/signup", async function (req, res) {
  const requiredBody = z.object({
    email: z.string().min(3).max(100).email(),
    name: z.string().min(3).max(100),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be at most 100 characters")
      .regex(/[0-9]/, "Password must contain at least one digit")
      .regex(/[A-Z]/, "Password must contain at least one uppercase character")
      .regex(
        /[$&+,:;=?@#|'<>.^*()%!-]/,
        "Password must contain at least one special character"
      ),
  });
  const parsedData = requiredBody.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      message: "Invalid Data format",
      error: parsedData.error.issues,
    });
  }

  try {
    const { email, password, name } = parsedData.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.create({
      email,
      name,
      password: hashedPassword,
    });

    res.status(201).json({ message: "You are Signed Up" });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
});






app.post("/signin", async function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  const user = await UserModel.findOne({
    email: email,
  });
  const matchedPassword = await bcrypt.compare(password, user.password);

  if (user && matchedPassword) {
    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      JWT_SECRET
    );
    res.json({
      token: token,
    });
  } else {
    res.status(403).json({
      message: "Incorrect Credentials",
    });
  }
});

// function auth(req, res, next) {
//   const token = req.headers.token;
//   const verifiedData = jwt.verify(token, JWT_SECRET);
//   if (verifiedData) {
//     req.userId = verifiedData.userId;
//     next();
//   } else {
//     res.status(403).json({
//       message: "Incorrect Credentials",
//     });
//   }
// }

app.post("/todo", auth, async function (req, res) {
  try {
    const userId = req.userId;
    const { title, done = false, dueDate } = req.body;

    if (!dueDate) {
      return res.status(400).json({ error: "dueDate is required" });
    }

    const parsedDueDate = new Date(dueDate);
    const now = new Date();

    if (parsedDueDate < now) {
      return res.status(400).json({ error: "Due date must be in the future" });
    }

    const newTodo = await TodoModel.create({
      userId,
      title,
      dueDate: parsedDueDate,
      done,
    });

    // Format response with local time
    const formattedTodo = {
      ...newTodo._doc,
      dueDate: newTodo.dueDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
      createdAt: newTodo.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
    };

    res.json({
      message: "Todo created successfully",
      todo: formattedTodo,
    });

  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Server error while creating todo" });
  }
});

app.patch("/todo/edit/:id", auth, async function (req, res) {
  try {
    const todoId = req.params.id;
    const userId = req.userId;
    const { title, done, dueDate } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (done !== undefined) updateData.done = done;

    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);
      const now = new Date();

      if (parsedDueDate < now) {
        return res.status(400).json({ error: "Due date must be in the future" });
      }

      updateData.dueDate = parsedDueDate;
    }

    const todo = await TodoModel.findOne({ _id: todoId, userId });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found or unauthorized" });
    }

    await TodoModel.updateOne({ _id: todoId }, updateData);

    const updatedTodo = await TodoModel.findById(todoId);

    const formattedUpdatedTodo = {
      ...updatedTodo._doc,
      dueDate: updatedTodo.dueDate?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
      createdAt: updatedTodo.createdAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
      updatedAt: updatedTodo.updatedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
    };

    res.json({
      message: "Todo updated successfully",
      todo: formattedUpdatedTodo,
    });

  } catch (err) {
    console.error("Error updating todo:", err);
    res.status(500).json({ message: "Error updating todo" });
  }
});

app.get("/todos", auth, async function (req, res) {
  const userId = req.userId;

  const todos = await TodoModel.find({
    userId,
  });
  
  res.json({
    todos,
  });
});



app.delete('/todo/remove/:id',auth,async function(req,res){
  const todoId=req.params.id;
    const userId = req.userId;

    const todo = await TodoModel.findOne({ _id: todoId, userId });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found or unauthorized" });
    }
    await TodoModel.deleteOne({ _id: todoId });

    res.json({
      message: "Todo deleted successfully",
    });
})

