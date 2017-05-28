// Requiring our dependencies models
var Note = require("../models/Note.js");
var Article = require("../models/Article.js");
var request = require("request");
var cheerio = require("cheerio");
var modalResult = {};
var scrapeCount = 0;



// Export routes
module.exports = function(app) {

    // Simple index route
    app.get("/", function(req, res) {

        modalResult = {
            found: scrapeCount
        };


        res.render("index", {
            modalResult
        });
    });

    // A GET request to scrape the echojs website
    app.get("/scrape", function(req, res) {


        // First, we grab the body of the html with request
        request("https://www.reddit.com/r/news/", function(error, response, html) {
            // Then, we load that into cheerio and save it to $ for a shorthand selector
            var $ = cheerio.load(html);
            // Now, we grab every h2 within an article tag, and do the following:
            var titleCount = $("p.title").length;



            $("p.title").each(function(i, element) {

                // Save an empty result object


                var result = {};


                // Add the text and href of every link, and save them as properties of the result object
                result.title = $(this).children("a").text();
                result.link = $(this).children("a").attr("href");

                // Using our Article model, create a new entry
                // This effectively passes the result object to the entry (and the title and link)
                var entry = new Article(result);
                scrapeCount++
                // Now, save that entry to the db
                entry.save(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    }
                    // Or log the doc
                    else {


                    }

                });

            });
            console.log(scrapeCount);

            scrapeCount = scrapeCount.toString();
            modalResult = {
                found: scrapeCount
            };

            console.log(modalResult);

            res.render("index", {
                modalResult
            });

            scrapeCount = 0;
        });

    });

    // This will get the articles we scraped from the mongoDB
    app.get("/articles", function(req, res) {
        // Grab every doc in the Articles array
        Article.find().populate('post', 'notes').exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Or send the doc to the browser as a json object
            else {
                console.log(doc);
                var recordsFound = doc.length;
                res.render("found", {
                    doc,
                    recordsFound
                });
            }
        });
    });

    // This will get the articles we scraped from the mongoDB and send json
    app.get("/api", function(req, res) {
        // Grab every doc in the Articles array
        Article.find().populate('post', 'notes').exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Or send the doc to the browser as a json object
            else {
                console.log(doc.notes + "=");
                res.json(doc);
            }
        });
    });

    // This will drop collections
    app.get("/drop", function(req, res) {
        Article.collection.drop();
        Note.collection.drop();
        res.redirect("/");

    });



    // Grab an article by it's ObjectId
    app.get("/articles/:id", function(req, res) {
        // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
        Article.findOne({
                "_id": req.params.id
            })
            // ..and populate all of the notes associated with it
            .populate('post', 'notes')
            // now, execute our query
            .exec(function(error, doc) {
                // Log any errors
                if (error) {
                    console.log(error);
                }
                // Otherwise, send the doc to the browser as a json object
                else {
                    res.json(doc);
                }
            });
    });



    // Grab an article by it's ObjectId and delete
    app.get("/delete/:id", function(req, res) {
        // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
        Article.remove({
                "_id": req.params.id
            })
            // ..and populate all of the notes associated with it
            .populate('post', 'notes')
            // now, execute our query
            .exec(function(error, doc) {
                // Log any errors
                if (error) {
                    console.log(error);
                }
                // Otherwise, send the doc to the browser as a json object
                else {
                    res.redirect("/articles")
                }
            });
    });

    // Grab an article by it's ObjectId
    app.get("/delete/note/:id", function(req, res) {
        // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
        Note.remove({
                "_id": req.params.id
            })
          
            // now, execute our query
            .exec(function(error, doc) {
                // Log any errors
                if (error) {
                    console.log(error);
                }
                // Otherwise, send the doc to the browser as a json object
                else {
                    res.redirect("/articles")
                }
            });
    });


    // Create a new note or replace an existing note
    app.post("/articles/new/:id", function(req, res) {
        // Create a new note and pass the req.body to the entry
        var newNote = new Note({
            notes: req.body.notes
        });
        console.log(req.params.id);
        console.log(newNote);

        // And save the new note the db
        newNote.save(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
                res.redirect("/articles");
            }
            // Otherwise
            else {
                // Use the article id to find and update it's note
                Article.findOneAndUpdate({
                        "_id": req.params.id
                    }, {
                        $push: {
                            'post': doc._id
                        }
                    }, {
                        'multi': true
                    })
                    // Execute the above query
                    .exec(function(err, doc) {
                        // Log any errors
                        if (err) {
                            console.log(err);
                        } else {
                            // Or send the document to the browser
                            //res.send(doc);
                            res.redirect("/articles");
                        }
                    });
            }
        });
    });

}