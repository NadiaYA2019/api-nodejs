const express = require('express');
//Import de dotenv pour les variables d'environnement
const dotenv = require('dotenv');
//Import d'AWS
const AWS = require('aws-sdk');

//Configuration de dotenv
dotenv.config();

//Configuration AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

//Initialisation nouvelle application express
const app = express();

//Création d'une instance de la base de données
const dynamodb = new AWS.DynamoDB.DocumentClient();

//Initalisation du port d'écoute de l'application
const port = process.env.port || 3000; //process.env.port permet d'écouter sur le port défini dans les variables d'environnement (notammment en prod)

//Permet à Express de traiter le corps des requêtes JSON
app.use(express.json());

//Démarrage du server
app.listen(port, () => {
    console.log("Serveur démarré sur le port " + port + " !");
});

//Création tableau tâches
const listTodo = [{ id: 1, title: "Todo 1" }, { id: 2, title: "Todo 2" }];

//Définition des routes de l'application
app.get("/", (req, res) => {
    res.send("Hello World avec Express.js !");
});

//Get todos avec base Mongo sur AWS
app.get("/getTodos", async (req, res) => {
    const params = {
        TableName: 'Todos',
    }
    try {
        const data = await dynamodb.scan(params).promise()
        res.send(data.Items);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

//Get todos avec données en dur sur le code
// app.get("/getTodos", (req, res) => {
//     res.send(listTaches);
//     // res.json(listTodo);
// });

app.get("/getTodo/:id", (req, res) => {
    if (!req.params.id) {
        res.status(400).send({ error: "Id de la tâche requis" })
    }
    else {
        const id = parseInt(req.params.id)
        const todoFilter = listTodo.filter(function (todo) {
            return todo.id === id;
        })
        res.send({ success: true, data: todoFilter });
    }
});

app.post("/addTodo", (req, res) => {
    if (!req.body.title && !req.body.id) {
        res.status(400).send({ error: "Construction de la tâche incomplète !" });
    }
    else {
        listTodo.push(req.body);
        res.status(201).send({ success: true, data: listTodo });
    }
})

app.put("/updateTodo/:id", (req, res) => {
    if (!req.body.title) {
        res.status(400).send({ error: "Nom de tâche requis" });
    }
    else {
        const id = parseInt(req.params.id)
        const todoFilter = listTodo.filter(function (todo) {
            return todo.id === id;
        })
        todoFilter.forEach((todo) => {
            todo.title = req.body.title
        })
        res.send({ success: true, data: listTodo });
    }
})

app.delete("/deleteTodo/:id", (req, res) => {
    if (!req.params.id) {
        res.status(400).send({ error: "Id de la tâche requis" })
    }
    else {
        const id = parseInt(req.params.id)
        const todoFilter = listTodo.filter(function (todo) {
            return todo.id === id;
        })
        todoFilter.forEach((todo) => {
            listTodo.splice(listTodo.findIndex((element) => element.id === todo.id), 1)
        })
        res.send({ success: true, data: listTodo.length === 0 ? "Pas de tâches à afficher" : listTodo });
    }

})