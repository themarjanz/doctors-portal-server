const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixc9ft1.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('doctors_protal').collection('services');
        const bookingCollection = client.db('doctors_protal').collection('bookings');


        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })
        // warning
        // THis is not proper way to query
        //  After learning about mongodb. use aggregate lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            const date = req.query.date;

            // step1: get all services
            const services = await serviceCollection.find().toArray();

            // step2: get the booking of that day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step3: for each service, find bookings for that services. output>[{},{},{},{},{}]
            services.forEach(service => {
                // step 4 find boings for that service. output>[{},{},{}]
                const serviceBookings = bookings.filter(book => book.treatment === service.name);
                // step 5: select slots for the service bookings: ['','']
                const bookedSlots = serviceBookings.map(book => book.slot);
                // step 6: slectet those slots are not in bookSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step7: set available to slots to make it easier
                service.slots = available;
            })
            res.send(services);

        })
        /*********
       * API Naming Convention
       * app.get('/booking') // get all bookings in this collection. or get more than one or by filter.
       * app.get('/booking/:id') //get a specific booking
       * app.post('/booking') // add a new booking
       * app.patch('/booking/:id') //patch a specific booking 
       * app.delete('/booking/:id') // delete a specific one 
       * ***************/

        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })


        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })

    }
    finally {

    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('HELLO FROM DOCTOR UNCLE')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})