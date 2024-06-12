const express = require("express");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Timestamp,
} = require("mongodb");
const port = process.env.PORT || 5000;
// middleware
const corsOptions = {
  origin: [
   "https://superlative-sfogliatella-e1f269.netlify.app",
    "http://localhost:5173",
    "http://localhost:5176",
    "https://real-estate-platform-b620c.web.app",
    "https://real-estate-platform-b620c.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());

// Verify Token Middleware

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ce00xrg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tostkkh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// {"_id":{"$oid":"665e9197b7e932bc770755f5"},"email":"hydravulgaris60@gmail.com","role":"admin","status":"verified","timestamp":{"$numberDouble":"1717473687281.0"}}
// {"_id":{"$oid":"665e9cfdb7e932bc771aeefb"},"email":"dipa@gmail.com","role":"agent","status":"verified","timestamp":{"$numberDouble":"1717476605229.0"}}

async function run() {
  try {
    const houseCollection = client.db("realEstatePlatform").collection("house");
    const reviewCollection = client
      .db("realEstatePlatform")
      .collection("reviews");
    const wishlistCollection = client
      .db("realEstatePlatform")
      .collection("wishlist");
    const userCollection = client.db("realEstatePlatform").collection("userss");
    const offerdCollection = client
      .db("realEstatePlatform")
      .collection("offerd");
    const paymentCollection = client
      .db("realEstatePlatform")
      .collection("payment");
    //
    // verify admin
    // const verifyAdmin = async (req, res, next) => {
    //   console.log('hello')
    //   const user = req.user
    //   const query = { email: user?.email }
    //   const result = await userCollection.findOne(query)
    //   console.log(result?.role)
    //   if (!result || result?.role !== 'admin')
    //     return res.status(401).send({ message: 'unauthorized access!!' })

    //   next()
    // }
    //
    //
    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });
    //  middleware
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // payment post
    app.post("/payment", async (req, res) => {
      const property = req.body;
      // console.log(property);
      const result = await paymentCollection.insertOne(property);
      res.send(result);
    });
    // sold property
    app.get("/payment", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    // offerd data collect  for guest
    app.get("/offerd/email/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "offerProperty.buyeremail": email };
      const result = await offerdCollection.find(query).toArray();
      res.send(result);
    });
    // offer data for payment
    app.get("/offerd/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await offerdCollection.findOne(query);
      res.send(result);
    });
    //
    // offfer post
    app.post("/offerd", async (req, res) => {
      const property = req.body;
      const result = await offerdCollection.insertOne(property);
      res.send(result);
    });
    //
    // offerd get for agent
    app.get("/offerd", async (req, res) => {
      const result = await offerdCollection.find().toArray();
      res.send(result);
    });

    // wishlist update
    app.get("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });

    // wishlist collection
    app.post("/wishlist", async (req, res) => {
      const property = req.body;
      const result = await wishlistCollection.insertOne(property);
      res.send(result);
    });
    // get wishlist data
    app.get("/wishlist/email/:email", async (req, res) => {
      const email = req.params.email;
      const query = { buyeremail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });
    // wishlist delte for user wishlist
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "User not found" });
      }
      res.send(result);
    });
    //  get user info by email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });
    //  save user data in db
    app.put("/user", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        if (user.status === "Requested") {
          // if existing user try to change his role
          const result = await userCollection.updateOne(query, {
            $set: { status: user?.status },
          });
          return res.send(result);
        } else {
          // if existing user login again
          return res.send(isExist);
        }
      }
      // save user 1st time
      const option = { upsert: true };

      const updateDoc = {
        $set: {
          ...user,
          Timestamp: Date.now(),
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    // get all users data from db
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      console.log(result)
      res.send(result);
    });

    //update a user role
    app.patch("/users/update/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      const updateDoc = {
        $set: { ...user, timestamp: Date.now() },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // delte admin can
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "User not found" });
      }
      res.send(result);
    });
    // get all house
    app.get("/house", async (req, res) => {
      const result = await houseCollection.find().toArray();
      res.send(result);
    });
  
    // petch for update
    app.patch("/house/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const update = req.body;

        // Construct the filter to identify the document to update
        const filter = { _id: new ObjectId(id) };

        // Construct the update operation using $set
        const updatedDoc = {
          $set: update,
        };

        // Execute the update operation
        const result = await houseCollection.updateOne(filter, updatedDoc);

        // Check if the document was found and updated successfully
        if (result.matchedCount && result.modifiedCount) {
          // Send a success response back to the client
          res.status(200).send({
            message: "updated successfully.",
            modifiedCount: result.modifiedCount,
          });
        } else {
          // If the document was not found or not updated, send an appropriate error response
          res.status(404).send({ message: " not found or not updated." });
        }
      } catch (error) {
        // Handle any errors that occur during the update operation
        console.error("Error updating house:", error);
        res.status(500).send({ message: "Internal server error." });
      }
    });

    // update agent property
    app.get("/house/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await houseCollection.findOne(query);
      res.send(result);
    });
    //   get for email
    app.get("/myaddedhouse/:email", async (req, res) => {
      const email = req.params.email;
      let query = { "agent.email": email };

      const result = await houseCollection.find(query).toArray();
      res.send(result);
    });

    // delete add properties
    app.delete("/myaddedhouse/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }
      const query = { _id: new ObjectId(id) };
      const result = await houseCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "User not found" });
      }
      res.send(result);
    });
    //   post property
    app.post("/house", async (req, res) => {
      const property = req.body;
      const result = await houseCollection.insertOne(property);
      res.send(result);
    });

    //   details for house
    app.get("/house/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await houseCollection.findOne(query);
      res.send(result);
    });
    // reviews post
    app.post("/reviews", async (req, res) => {
      const property = req.body;
      const result = await reviewCollection.insertOne(property);
      res.send(result);
    });

    //   reviews get
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    //   reviews get last 3
    app.get("/review", async (req, res) => {
      try {
        const result = await reviewCollection
          .find()
          .sort({ _id: -1 })
          .limit(3)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Failed to retrieve reviews:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // reviews delte from admin
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "User not found" });
      }
      res.send(result);
    });

    // get reviews which user add
    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      let query = { reviewerEmail: email };

      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });
    // delete add review
    app.delete("/review/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "User not found" });
      }
      res.send(result);
    });

    //   await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from platform Server..");
});

app.listen(port, () => {
  console.log(`platform is running on port ${port}`);
});
