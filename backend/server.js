const express = require("express");
const mongoose = require("mongoose");
const app = express();

mongoose.connect("mongodb+srv://3100admin:mongo3100@petquest-test.zutwh.mongodb.net/?retryWrites=true&w=majority&appName=PetQuest-Test")
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
})
.catch(() => {
    console.log("Error connecting to MongoDB");
});