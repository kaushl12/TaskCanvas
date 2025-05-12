const mongoose=require('mongoose')
const ObjectId=mongoose.ObjectId
const Schema=mongoose.Schema

const User=new Schema({
    email: {type: String, unique: true},
    password: String,
    name: String
})
const Todo=new Schema({
    title: String,
    dueDate: Date,                                    
    done: Boolean,
    userId: { type: Schema.Types.ObjectId, ref: 'users' }
},{ timestamps:true });

const UserModel=mongoose.model('users',User)
const TodoModel=mongoose.model('todos',Todo)

module.exports={
    UserModel:UserModel,
    TodoModel:TodoModel
}