// Importer Express pour créer notre serveur API
import express from 'express';
import { todos } from './todos.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import bodyParser from 'body-parser'

//configure l'environnement
dotenv.config();


//configurez AWS SDK 
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyID: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

console.log(process.env)
// Initialiser une nouvelle application Express
const app = express();

//creer une instance de ma base de données

const dynamodb = new AWS.DynamoDB.DocumentClient();

app.use(express.json())

// Permettre à Express de traiter le corps des requêtes JSON

// Définir une route de base qui envoie un message de bienvenue
// Challenge : Comment répondre à une requête GET sur la racine ?

//const todos = require('./todos.js')


app.get('/', (req, res) => {
    res.send("Hello World Nadia training friday");
})




//Get todos avec base Mongo sur AWS
app.get("/todos", async (req, res) => {
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

app.post("/todos-aws", async (req, res) => {
    const newtodo = {
        id: AWS.util.uuid.v4(),
        description: "this is a great nodejs tutorial",
        title: "Nadia",
    }
    const params = {
        TableName: 'Todos',
        Item: newtodo
    }

    try {
        await dynamodb.put(params).promise()
        res.send(newtodo)
    }
    catch (err) {
        res.status(500).send(err.toString())
    }

})



app.put('/todos-aws/:id', async (req, res) => {
    const updateKeys = Object.keys(req.body);
    if (updateKeys.length === 0) {
        return res.status(400).send('No field to update')
    }

    const params = {
        TableName: 'Todos',
        Key: {
            'id': req.params.id
        },
        UpdateExpression: "set",
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {}
    };

    updateKeys.forEach((key, index) => {
        const attributeKey = `#attr${key}`;
        const attributeValue = `:value${key}`;
        params.UpdateExpression += ` ${attributeKey} = ${attributeValue}`;
        params.ExpressionAttributeNames[attributeKey] = key;
        params.ExpressionAttributeValues[attributeValue] = req.body[key];

        if (index < updateKeys.length - 1) {
            params.UpdateExpression += ",";
        }
    });
    console.log(params.UpdateExpression.toString())
    try {
        const data = await dynamodb.update(params).promise();
        console.log('sucesss')
        res.send(data.Attributes);
    } catch (err) {
        res.status(500).send(err.toString());
    }

});

app.delete('/todos-aws/:id', async (req, res) => {
    const params = {
        TableName: 'Todos',
        Key: {
            'id': req.params.id
        }
    };
    try {
        const data = await dynamodb.delete(params).promise();
        console.log('sucesss')
        res.send(data.Attributes);
    } catch (err) {
        res.status(500).send(err.toString());
    }

});


app.get('/todo-aws/:id', async (req, res) => {

    const params = {
        TableName: 'Todos',
        Key: {
            'id': req.params.id
        }
    };

    try {
        const data = await dynamodb.get(params).promise();
        console.log(req.params.id)
        res.send(data.Item);
    } catch (err) {
        res.status(500).send(err.toString());
    }
})




app.get('/todo/:id', (req, res) => {
    const id = parseInt(req.params.id)
    const todo = todos.find((t) => t.id === id)
    if (todo) {
        res.status(200).send(todo);
    }
    else {
        res.status(404).send("Ressource introuvable");
    }
})

app.get('/todo/:category/:priority', (req, res) => {

    const cat = req.params.category
    const priority = parseInt(req.params.priority)
    //console.log(id)
    const filteredtodos = todos.find((t) => t.priority === priority && t.category === cat)
    //console.log(todo)
    res.send(filteredtodos);
})

//Définir une route pour ajouter une nouvelle todo
//comment traiter une nouvelle tâche via une requête post
//201

app.post('/add/todo', (req, res) => {
    //const newTodo = { id: 1, name: "prepare a work plan for the intership", priority: 1 }
    const { id, name, priority } = req.body
    todos.push({ id: id, name: name, priority: priority });
    res.status(201).send(todos)
})

app.delete('/todo/:id', (req, res) => {
    const id = req.params.id;
    console.log(id)
    index = todos.findIndex((elt) => elt.id === id)
    console.log(index)
    if (index !== -1) {
        todos.splice(index, 1); // Supprime l'élément de todos à l'index trouvé
        res.status(200).send({ message: 'Todo supprimé avec succès' });
    } else {
        res.status(404).send({ error: 'Todo non trouvé' });
    }
})

app.put('/todos/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex > -1) {
        const updatedTodo = { ...todos[todoIndex], ...req.body };
        todos[todoIndex] = updatedTodo;
        res.status(200).send(updatedTodo);
    } else {
        res.status(404).send({ message: 'Todo not found' });
    }
});

// Démarrer le serveur sur un port spécifique
// Challenge : Comment démarrer le serveur et écouter sur un port ?
const port = process.env.port || 3000;
app.listen(port, () => { console.log("Serveur à l'écoute") })


//middleware 
app.use(bodyParser.raw({
    type: 'application/octet-stream',
    limit: '100mb'
}));


//Configure S3 pour AWS 

const s3 = new AWS.S3();
app.post('/upload', (req, res) => {

    const fileName = req.headers['x-file-name']
    if (!fileName) {
        return res.status(400).send('Nom de fichier manquant')
    }

    const params = {
        Bucket: 'youarelucky-bucket',
        Key: `${Date.now().toString()}-${fileName}`,
        Body: req.body,
        ContentType: req.headers['content-type']
    }


    s3.upload(params, (err, data) => {
        if (err) {
            console.log("Erreur", err)
            return res.status(500).send('erreur upload')
        }
        return res.send({ message: "Fichier déposé avec succès" })
    })
})

/*try {
    await s3.upload(params).promise();
    res.status(200).send('File uploaded to S3 successfully!');
} catch (error) {
    console.error(error);
    res.status(500).send('Error uploading file to S3');
}*/




//configure un middleware spécifique pour /upload 


