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
    const title = req.body.title;
    const done = req.body.done || false;
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    // const updatedAt = new Date(); 


    // Create the new todo
    await TodoModel.create({
      userId,
      title,
      dueDate,
      done,
    });

    // Fetch all todos for this user
    const todos = await TodoModel.find({ userId });

    // Format dueDate and createdAt in IST (or your local time)
    const formattedTodos = todos.map(todo => ({
      ...todo._doc,
      dueDate: todo.dueDate
        ? todo.dueDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : null,
      createdAt: todo.createdAt
        ? todo.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : null,
    }));

    // Send response
    res.json({
      message: "Todo created successfully",
      todos: formattedTodos,
    });

  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Server error while creating todo" });
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


app.patch("/todo/edit/:id",auth,async function(req,res){
  try{
    const todoId=req.params.id;
    const userId = req.userId;
    const title = req.body.title;
    const done = req.body.done || false;
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

    const updateData={};
    if(title !== undefined) updateData.title=title;
    if(dueDate !== undefined) updateData.dueDate=dueDate;
    if(done !== undefined) updateData.done=done;

    // Check if todo exists and belongs to this user
    const todo = await TodoModel.findOne({ _id: todoId, userId });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found or unauthorized" });
    }
    await TodoModel.updateOne({ _id: todoId }, updateData);

    // Send updated todo back (optional)
    const updatedTodo = await TodoModel.findById(todoId);

    res.json({
      message: "Todo updated successfully",
      todo: updatedTodo,
    });


  }catch(err){
     console.error("Error updating todo:", err);
    res.status(500).json({
      message: "Error updating todo",
    });
  }
    
});

app.listen(3000);
