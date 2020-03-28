const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const db = require('./db')
const dbHelp = require('./dbHelperFunctions')
const app = express()
const port = 8084
const Review = require('./db')
const cors = require('cors')
const pirateSpeak = require('pirate-speak')
const piratize = require('./piratize')




piratize.addToDictionary()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// mongoose.connect('mongodb://localhost/test1', { useNewUrlParser: true });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function () {
//     // we're connected!

// });
// const reviewSchema = new mongoose.Schema({
//     "image": Array,
//     "overall": Number,
//     "vote": String,
//     "verified": Boolean,
//     "reviewTime": String,
//     "reviewerID": String,
//     "asin": String,
//     "style": Object,
//     "reviewerName": String,
//     "reviewText": String,
//     "summary": String,
//     "unixReviewTime": Number,
//     "sweepstakes": Boolean,
//     "authorCount": Number

// });



// reviewSchema.plugin(mongoosePaginate);


// Product = mongoose.model('Product', reviewSchema);

// Review = mongoose.model('Review', reviewSchema);



app.use(express.static(path.join(__dirname, "client/dist")));

app.get('/', (req, res) => res.send('Review service'))



app.get('/reviews', (req, res, next) => {
    console.log(dbHelp.randomYear())
    console.log(dbHelp.randomShip())
    console.log(dbHelp.randomName())
    const page = parseInt(req.query.page)
    const overall = parseInt(req.query.overall)
    const queryOptions = { asin: req.query.productID }
      if (overall < 6) {
          queryOptions.overall = overall
      }
    const reviewCountByRating = {
        ratio: null,
        total: null,
        5: { star: '5', count: 0 },
        4: { star: '4', count: 0 },
        3: { star: '3', count: 0 },
        2: { star: '2', count: 0 },
        1: { star: '1', count: 0 }
    }

    Promise.all([
        db.Review.paginate(queryOptions, { page: page }),

        db.Review.count({ asin: req.query.productID, overall: 1 }),
        
        db.Review.count({ asin: req.query.productID, overall: 2 }),
        
        db.Review.count({ asin: req.query.productID, overall: 3 }),
        
        db.Review.count({ asin: req.query.productID, overall: 4 }),
        
        db.Review.count({ asin: req.query.productID, overall: 5 }),
        
    ])
    .then(results =>{
        for(var i = 1; i < results.length; i++){
            reviewCountByRating[i].count = results[i]
            reviewCountByRating.total += reviewCountByRating[i].count
        }
        reviewCountByRating.ratio = dbHelp.findRatio(reviewCountByRating);
        results[0].reviewCountByRating = reviewCountByRating;
        return results[0] 
    })
    .then(async results => {
        // console.log('results before map=======',results.docs)
        
        for(var i = 0; i < results.docs.length; i++){
            results.docs[i].authorCount = await db.Review.count({ reviewerID: results.docs[i].reviewerID})
            results.docs[i].ship = `${dbHelp.randomYear()} ${dbHelp.randomName()} ${dbHelp.randomShip()}`
        }
       
        return results;
        
    })
    .then(results => {
            results.docs.map(review => {
                review.reviewText = pirateSpeak.translate(review.reviewText)
                review.summary = pirateSpeak.translate(review.summary)
                review.sweepstakes = dbHelp.badgify(review)
                  if (review.reviewerName === 'Amazon Customer') {
                    review.reviewerName = 'Arrtozone Customer'
                  }
            });  
        return results;
    }) 
    .then(results => {
        results.docs.map(review => {
            review.authorCount = db.Review.count({reviewerID: review.reviewerID})
        })
        return results;
    })
    .then(results => {
            res.status(200).send(results)
    })    
    .catch(err => {
            console.error(err)
            res.status(500).json({ error: err })
    })        
            
});

app.get('/reviewer', (req, res, next) => {
    console.log(typeof req.query.reviewerID)
    Review.count({ reviewerID: req.query.reviewerID})
    .then( result => {
        res.status(200).json({data: result})
    })
    .catch(err => {
        console.error(err)
        res.status(500).json({ error: err })
    })  

});

        
app.listen(port, () => console.log(`Service listening on port ${port}!`))