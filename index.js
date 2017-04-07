//set number of articles to scrape and version of Ars Technica: us or uk
var articlesNumber = 100,
    version = 'us';

//import dependencies
var fs = require('fs'),
    _ = require('underscore'),
    Nightmare = require('nightmare'),
    nightmare = Nightmare({
        // openDevTools: {
        //     mode: 'detach'
        // },
        // show: true
    });

//set dictionary, counters variables, tsv headers
var url,
    topics = [],
    articlesLinksList = [],
    loadedArticles = 0,
    edgesHeader = 'source\ttarget\n',
    nodesHeader = 'id\n',
    articlesListHeader = 'ranking\ttitle\tcategory\tauthor\tauthorJob\tlink\ttimestamp\tcomments\tofficialTags\tauthorTags\n';

//get date and create new folder
var d = new Date(),
    date = d.toISOString(),
    newFolder = 'arsTechnicaPolicy_' + version + '_' + date.substring(0, 10) + '(' + date.substring(11, 13) + '-' + date.substring(14, 16) + '-' + date.substring(17, 19) + ')';

fs.mkdirSync(newFolder);

//create edges tsv file
fs.writeFileSync(newFolder + '/edges.tsv', edgesHeader);
//create nodes tsv file
fs.writeFileSync(newFolder + '/nodes.tsv', nodesHeader);
//create articles list tsv file
fs.writeFileSync(newFolder + '/articlesList.tsv', articlesListHeader);

//function that extract info from an article
function extractInfo(counter) {
    console.log('retrieving info from article n. ' + (counter + 1) + '…');

    nightmare
        .goto(articlesLinksList[counter].link)
        .wait('.content-wrapper')
        .evaluate(function() {
            var title = ars.ARTICLE.title,
                category = ars.CATEGORY,
                author = ars.ARTICLE.arsStaff[ars.ARTICLE.author].name,
                job = ars.ARTICLE.arsStaff[ars.ARTICLE.author].title,
                shortlink = ars.ARTICLE.short_url,
                time = document.querySelector('.content-wrapper header .post-meta time').attributes[1].value,
                comments = ars.ARTICLE.comments,
                officialTags = ars.AD.kw,
                authorTags = digitalData.keywords.display;

            return {
                title: title,
                category: category,
                author: author,
                job: job,
                shortlink: shortlink,
                time: time * 1000,
                comments: comments,
                officialTags: officialTags,
                authorTags: authorTags
            }
        })
        .then(function(articleObject) {
            console.log('Info retrieved.');

            //ready all the variables
            var timestamp = new Date(articleObject.time),
                officialTags = '',
                authorTags = articleObject.authorTags.replace(/type:.*/, '').replace(/\|/g, '; ');

            _.each(articleObject.officialTags, function(tag, index, array) {
                //check if the tags are present in the dictionary
                var match = _.indexOf(topics, tag);
                if (match === -1) {
                    //if not add it and update the nodes tsv
                    topics.push(tag);
                    fs.appendFileSync(newFolder + '/nodes.tsv', tag + '\n');
                }

                //create links between tags and update the edges tsv
                var connectionsArray = _.without(array, tag);
                _.each(connectionsArray, function (target) {
                    fs.appendFileSync(newFolder + '/edges.tsv', tag + '\t' + target + '\n');
                })

                //create the string for the article tsv
                if (index < (array.length - 1)) {
                    officialTags += tag + '; ';
                } else {
                    officialTags += tag
                }
            })

            //push the values to the articles tsv
            var firstHalf = articlesLinksList[counter].rank + '\t' + articleObject.title + '\t' + articleObject.category + '\t' + articleObject.author + '\t' + articleObject.job + '\t',
                secondHalf = articleObject.shortlink + '\t' + timestamp.toLocaleDateString() + '\t' + articleObject.comments + '\t' + officialTags + '\t' + authorTags + '\n',
                newLine = firstHalf + secondHalf;

            fs.appendFileSync(newFolder + '/articlesList.tsv', newLine);

            //repeat until all the articles have been scraped
            if (counter < (articlesLinksList.length - 1)) {
                extractInfo(counter + 1);
            } else {
                //close Electron
                nightmare
                    .evaluate()
                    .end()
                    .then();

                console.log('\nDone! Retrived all info from the ' + articlesNumber + ' articles in Ars Technica\'s ' + version.toUpperCase() + ' Policy section');
            }
        });
}

//function that retrieves all the Articles
function getArticles(page) {
    
    //load page
    nightmare
        .goto('http://' + url + '/tech-policy/page/' + page + '/')
        .wait('.content-wrapper')
        .evaluate(function(loadedArticles) {
            //select all the articles in the page
            var linkNodes = document.querySelectorAll('.content-wrapper article .overlay'),
                linksList = [];

            //get their links
            linkNodes.forEach(function(link, index) {
                var newLink = {
                    link: link.href,
                    rank: index + 1 + loadedArticles
                }
                linksList.push(newLink);
            })

            return linksList;

        }, loadedArticles)
        .then(function(linksList) {
            loadedArticles += linksList.length;
            articlesLinksList.push.apply(articlesLinksList, linksList);

            if (loadedArticles < articlesNumber) {
                console.log(loadedArticles + '/' + articlesNumber + ' articles collected. Going to page ' + (page++) + '…');

                //get more articles
                getArticles(page++);

            } else {
                console.log('All articles collected. Getting the info…');

                //final corpus
                articlesLinksList = _.first(articlesLinksList, articlesNumber);
                //call the function to extract the info from the corpus
                extractInfo(0);
            }
        })
}

//start collection
console.log('retrieving articles from Ars Technica…');

//pick correct URL based on version
if (version === 'uk') {
    url = 'arstechnica.co.uk';
} else {
    url = 'arstechnica.com';
}

getArticles(1);
