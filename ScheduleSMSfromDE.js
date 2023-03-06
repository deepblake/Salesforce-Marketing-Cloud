<script runat="server">

  Platform.Load("Core","1.1.1");
  var api = new Script.Util.WSProxy();
  
  var setup = {   //Install package credentials
    authBaseURI: "https://XXXXXX.auth.marketingcloudapis.com/",
    restBaseURI: "https://XXXXXX.rest.marketingcloudapis.com/",
    clientId: "XXXXXXX",
    clientSecret: "XXXXXX",
    account_id: "XXXXXX"    //(MID)
  }

  
  try {
    var token = getToken(setup);
    var success = false;
    if (!!token) success = triggerEvent(token, setup, data);         
  } catch (err) {
    Write("Error: " + Stringify(err));
  }

  function getToken(setup) {
    var config = {
      url : setup.authBaseURI + "v2/token",
      contentType : "application/json",
      payload : {
        "client_id": setup.clientId,
        "client_secret": setup.clientSecret,
        "grant_type": "client_credentials"
      }
    }
    var req = HTTP.Post(config.url, config.contentType, Stringify(config.payload));
    if (req.StatusCode == 200) {
      var res = Platform.Function.ParseJSON(req.Response[0]);
      return res.access_token;
    } else {
      return false;
    }
  }

  function triggerEvent(token, setup, data) {
      var customerKey = "XXXXXX-XXXX-XXXX-XXXX-XXXXXX"; //Data Extension External Key
    
      var result = api.retrieve( //This retrieve returns an object of all of the values in the field "Phone" of the customerKey DE
     "DataExtensionObject[" + customerKey + "]", 
     ["Phone"]
     );

      var phoneNumbers = [];
      for (i = 0; i < (result.Results.length); i++) { //Here the Data Extension object is parsed to make an array of phone numbers
      phoneNumbers[i] = (result.Results[i].Properties[0].Value);
      } 
      
      var minute = "00"     //Statically setting the minute value to 00

      var now = new Date();
      
      if (now.getHours() >= 23){        //This solves for the case when it is 11pm, and the text is meant to be sent at 12am the next day
          now.setHours(0);
      }
      else {
          currentH = now.getHours() + 1;        //Add one because this sc ript runs right before the text should be sent out
          now.setHours(currentH);
      }

      //UTC Conversions (SF docs say it has to be UTC)
      var utcDay = now.getUTCDate();
      var utcMonth = now.getUTCMonth()+1;
      var utcYear = Stringify(now.getUTCFullYear());
      var utcHour = now.getUTCHours();
      
      //Those now.getUTC^ functions return the number values without leading 0's so....
      if (utcMonth < 10){utcMonth = "0" + Stringify(utcMonth);}
      if (utcDay < 10){utcDay = "0" + Stringify(utcDay);}
      if (utcHour < 10){utcHour = "0" + Stringify(utcHour);}
       
      //UTC format example: "2022-09-08 21:05"
      var sendString = utcYear.concat("-",utcMonth, "-", utcDay, " ", utcHour, ":", minute);
      
      var config = {
        url : setup.restBaseURI + "sms/v1/messageContact/XXXXXX/send",
        contentType : "application/json",
        headerName : ["Authorization"],
        headerValue : ["Bearer " + token],
        payload : {       //Subscribe and Keyword are both required.
            Subscribe: true,
            mobileNumbers: phoneNumbers,
            keyword: "XXXX",
            SendTime: sendString        //You could do this whole thing without SendTime and the SMS would send immediately 
        }
      }

      var req = HTTP.Post(config.url, config.contentType, Stringify(config.payload), config.headerName, config.headerValue);

      if (req.StatusCode == 201) {
        var res = Platform.Function.ParseJSON(req["Response"][0]);
        if (res.eventInstanceId != null && res.eventInstanceId != "") return true;
      } 

      else { return false; }
  }
  



</script>