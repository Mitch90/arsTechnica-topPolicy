# arsTechnica-topPolicy
Node script that gets the top articles in the policy section on ArsTechnica and outputs a network of keyword relations

###To run arsTechnica-topPolicy:

* Make sure you have [Node](https://nodejs.org/en/) installed

* Clone the repository

* Go to the arsTechnica-topPolicy folder
```
cd pathToTheArsTechnica-topPolicyFolder
```

* Install node modules
```
npm install
```

* Open **index.js** and choose the number of articles to retrieve and the version of ArsTechica that you prefer (us or uk)
```javascript
var articlesNumber = 100,
    version = 'us';
```

* Run the script
```
node index.js
```
