const mongoose=require('mongoose')
const ObjectId=mongoose.ObjectId
const Schema=mongoose.Schema

const User=new Schema({
    email: {type: String, unique: true},
    password: String,
    name: String
})
const Todo=new Schema({
     title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  done: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
}, { timestamps: true });

const UserModel=mongoose.model('users',User)
const TodoModel=mongoose.model('todos',Todo)

module.exports={
    UserModel:UserModel,
    TodoModel:TodoModel
}