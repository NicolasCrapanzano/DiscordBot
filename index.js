const Discord = require("discord.js");
const fetch = require("node-fetch");
const ytdl = require('ytdl-core');
const client = new Discord.Client();

//Categories are different depending on type !!!!
const category = [ "waifu","neko","shinobu","megumin","bully","cuddle","cry","hug","awoo","kiss","lick","pat","smug","bonk","yeet","blush","smile","wave","highfive","handhold","nom","bite","glomp","slap","kill","kick","happy","wink","poke","dance","cringe"];

const categoryH = ["waifu","neko","trap","blowjob"];

//anifoto : 3 params, command | type | category 
// https://api.waifu.pics/type/category
const keyWords = ["$anifrase","$anifoto","$channelset","$help","$leave","$play"];
const keyWordsParamsFoto = ["H"]; //check if foto is sfw || nsfw, check foto type
const keyWordsParamsFrase = [""]; //check if the user wants frase from a particular anime

var channelKeyWords = ["here"];
var allowedChannels;
var isChannelRestrainOn = false;
var channelsTemporal;

let botInVC = false; //is the boy connected to the voice chat?
let connection;

let searchRecursion; //limits the ammount of times the youtube search auto calls itself

client.on("ready", () => {

  console.log(`Logged in as ${client.user.tag}!`+"\n");

})

client.on("message", msg => {
  
  if(msg.author.bot){ //if the author of the message is a bot do nothing
    return;
  }

  //By default the bot checks all channels
  //check if user restrained bot to a specific channel
  if(allowedChannels && msg.channel.name != allowedChannels){ 
    console.log(`bot not allowed on channel ${msg.channel.name}`);
    return;
  }

  //check if message is a command, if not, do nothing
  if( msg.content[0] === "$"){
    var newMsg = msg.content;
    
    console.log("entered $:"+newMsg+"/");

    
    //check if command exist
    var check = checkCommand(newMsg);
    console.log("\n" + "command: " + check[0] + " Type: "+check[1] + " Cat: "+check[2]);

    switch(check[0]){
      case -1:
        console.log("invalid param: "+check);
        break;
      case 0: //send frase
        getQuote().then(quote => msg.channel.send(quote));
        break;
      
      case 1: //send foto        
        console.log("Ft: "+check);
        getAnimeImg(check[1],check[2]).then(img => msg.channel.send(img));
        break;
      
      case 2: //channel set

        if(check[2] != -1){
          channelsTemporal = check[2][1];
          
        }else{
          channelsTemporal = msg.channel.name;
          console.log("channel set to here: ",channelsTemporal);
        }
        setChannel(msg,channelsTemporal);
        break;
      
      case 3: //send a list of commands to user ? or channel?
        console.log("Help");
        getHelp(msg);
        break;

      case 4: 
        console.log("leaving voice channel");
        leaveVoiceChat(msg);
        break;

      case 5: 
        
        if(check[2] === 0){
          console.log("play something on voice channel \n");
          playVCVideo(msg,check[1]);
        }else if(check[2] === 1){
          searchYTVideo(check[1],msg);
          console.log("search query and play on voice channel \n");
        }else{
          
          console.log("this shouldnt happen, contanct a developer");
        }
        break;

      case 6:
        console.log("search for video");
        break;
    }

  }

})

function playVCVideo(msg,link){
  let linkLocal = link[1];
  console.log(link);
  if(linkLocal === -1){
    linkLocal = "https://www.youtube.com/watch?v=jzO8x1pnbCk";
  }

  if(msg.member.voice.channel){
    //this should be the other way arround, first check if video is aval
    connection = msg.member.voice.channel.join().then(
      async connection =>{
        try {

          let info = await ytdl.getInfo(linkLocal);
          if(info.player_response.playabilityStatus.status === "UNPLAYABLE"){

            msg.reply("Ooops, something went wrong and we cant play the video, "+info.player_response.playabilityStatus.reason);
            
          }else{

            connection.play(ytdl(linkLocal, { filter: 'audioonly' }));

          }
        } catch(e){

          console.log("Error: ",e);
          msg.reply(`Ooops, something went wrong, check if the command is correctly writen and the link valid \n ${e}`);

        }
        
    });
    botInVC = true;
  }else{
    msg.reply('you need to join a voice channel first');
  }

}

function searchYTVideo(query,msg){

  jQuery = query.join('+');//if there is multiple words fuse them with a '+' sign

  url = "https://www.googleapis.com/youtube/v3/search";
  url += "?key="+process.env.GLKEY;
  url += "&youtube.search.list?&part=snippet";
  url += "&q="+jQuery;
  console.log(url);
  
  try{
    
    return fetch( url )
    .then ( response => response.json() )
    .then ( videoData => {
      displaySearch(videoData,msg);
    })

  } catch(e){
    //this shouldnt happen unless google is not responding.
    console.log(e);
    
  }
  
}

function displaySearch(searchData,msg){
  let query = {};
  //console.log(searchData); do this but on a loop for the 5 results
  for(let i = 0; i < 5 ; i++){    
    query[i] =
      "\n" + searchData.items[i].snippet.title + "\n" +
      searchData.items[i].snippet.thumbnails.high.url + "\n";
      //https://www.youtube.com/watch?v="+searchData.items[i].id.videoId 
      //this shouldnt display, when an option is selected, this should be sent to playVCVideo as param
  }
  msg.reply(query[0] + query[1] + query[2] + query[3] + query[4]);
}

function leaveVoiceChat(msg){
  
  if(msg.member.voice.channel){
    connection = msg.member.voice.channel.leave();
    botInVC = false;
  }else{
    msg.reply('The bot is not connected to any voice channel');
  }
  
}

function checkCommand(msg){

  var stringArray = msg.split(/\s/);
  console.log("split: ",stringArray);
  //this variables should point to positions on arrays, not the data itself
  var checkCommand = -1;  //stringArray 0
  var checkType = -1; //stringArray 1
  var checkCat = -1; //stringArray 2  
  var hasParams = false; //check if stringArray is bigger than 

  //first check what command the user input
  if(keyWords.indexOf(stringArray[0]) != -1){
    checkCommand = keyWords.indexOf(stringArray[0]);
  }

  if( stringArray.length >= 2 ){
    hasParams = true;
  }

  //check params based on command
  if(checkCommand === 0){ //frases command
    console.log("frases");
  }else if(checkCommand === 1){ //foto command
     //set Type sfw / nsfw
    console.log(keyWordsParamsFoto.indexOf(stringArray[1]) != -1);

    if(keyWordsParamsFoto.indexOf(stringArray[1]) != -1){
      checkType = keyWordsParamsFoto.indexOf(stringArray[1]);
    }

    //Set categories
    if(checkType === 0 && categoryH.indexOf(stringArray[2] != -1)){
      //nsfw cat
      checkCat = categoryH.indexOf(stringArray[2]);
    }else if(category.indexOf(stringArray[1]) != -1){
      //sfw cat
      checkCat = category.indexOf(stringArray[1]);
      console.log("found sfw cat",checkCat);
    }

  }else if(checkCommand === 2){ //set channel
  //set where the bot should listen
    if(channelKeyWords.indexOf(stringArray[1]) != -1) {//set it to the channel the command was sent
      checkType = channelKeyWords.indexOf(stringArray[1]);
      console.log("selected here: ");
    }else if( hasParams === true ){
      checkCat = [1,stringArray[1]]; //this means that the user selected a channel name
      console.log("selected custom: ");
    }
  }else if(checkCommand === 3){ //returns a list of bot commands and params

    console.log("help");
  }else if(checkCommand === 4){ //Leave VC command

    console.log("leave vc");
  }else if(checkCommand === 5){ //join && play audio on VC command

    if( hasParams === true ){
      checkType = stringArray;
      if (stringArray[1].startsWith("https")){ //starts with https so        
        checkCat = 0; //this means that the string is a link
        console.log("play audio: ",checkType);
      }else{
        checkType.splice(0,1);
        checkCat = 1; //this means that the string is a search query
        console.log("search video: ",checkType);
      }
    }else{
      console.log("cant play video, no parameter");
    }
    
  }
  var fullRequest = [checkCommand,checkType,checkCat]
  return fullRequest;

}

function getHelp(msg){
  //this whole script should be change, showing all commands and params at once its too convoluted, better show a list of base commands and filter from there individually
  msg.reply(client.user.tag+" has "+ keyWords.length + " commands!\n"+"- $anifrase\n\t"+"Displays an anime frase !\n"+"- $anifoto\n\t"+"It takes 3 parameters $anifoto | type | category\n\t"+"default tpye is sfw, if you add H it turns nsfw\n\t"+"Categories, are the contents of the photos here you have a list.\n"+"SFW:\t"+category+"\n\t"+"NSFW:\n\t"+categoryH);
}

function setChannel(msg,channelName){
  let name = channelName;
  let chList = checkExistingChannels(msg);

  if(chList.indexOf(name) != -1 ){
    console.log("\n");
    console.log(`Set to (${name})`);
    allowedChannels = name;
  }else{
    console.log(`channel name (${name}) not found`);
  }
}

function checkExistingChannels(msg){

  const svCollection = msg.guild.channels.cache;
  const channelsKeys = svCollection.keys();
  let tempChannelList = [];

  svCollection.forEach( (value) => {
    if(value.type === "text"){
      tempChannelList.push(value.name);
    }
  })

  return tempChannelList;
}

function getQuote() {
  
  return fetch("https://animechan.vercel.app/api/random")
    .then(response => response.json())
    .then(quote => {
      return quote["quote"] + "\n \t" +" -" + quote["character"] 
      })
}

function getAnimeImg(imgType,imgCat) {
  //base url
  var url = "https://api.waifu.pics/";

  if(imgType != -1){
    url += "nsfw/";
    if(imgCat != -1){
      url += categoryH[imgCat]
    }else{
      url += categoryH[ randomRange (0, categoryH.length)];
    }
  }else{
    url += "sfw/";
    if(imgCat != -1){
      url += category[imgCat]
    }else{
      url += category[ randomRange (0, category.length)];
    }
  }
  
  console.log(url);
  //add type, if none, default to sfw
  //set category, if none, pick random
  
  return fetch( url )
  .then (response => response.json())
  .then ( img => {
    return img["url"]
  })

}

function randomRange(min, max){
  return Math.floor( Math.random() * (max - min) ) + min;
}

client.login(process.env.TOKEN)
