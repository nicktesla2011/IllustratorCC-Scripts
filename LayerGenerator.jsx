//Apply to myDoc the active document You have to manually open or create a new docuemtn

var myDoc = app.activeDocument; 
//define first character and how many layers do you need 

var layerIniName =65; 
var numberOfLayers=5; 

//Create the layers to the upper limit you specified above

for(var i=0; i<=numberOfLayers; i++) { 
var layerName = String.fromCharCode(layerIniName); 
var myLayer = myDoc.layers.add(); 
myLayer.name = layerName; 
layerIniName++ }
