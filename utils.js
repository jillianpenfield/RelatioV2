/*
Utility functions that have not been integrated yet to preserve flow structure and not confuse working code.
*/
//this will make an options menu
function sendOptions(recipientId){
    request({
      url: "https://graph.facebook.com/v6.0/me/messages", 
      qs: {access_token: 'EAAliG7mvpQkBAHoWfPfpw4WyFUTW0N1zyLb8yrrHu6vLZBfCNE1I9ByMJ83JLaJZCnlgeqyU1Lu3HQyZAUzJa89wq2CYdpDGQZCKpeZAaOBoKoM13ME5UfC6FZBYJMMrJeZAz9sC5ZBjnI3D17fGNU1p1dvmbtzCwSioVM7ivB77OAZDZD'},
      method: "POST",
      json: {
        recipient: {id: recipientId},
        message: {
          attachment:{
            type: "template",
            payload:{
              template_type: "generic",
              text: "Relatio Options",
              buttons: [
                {
                  type:"postback",
                  title: "Analyze",
                  payload: "analyze"
                },
                {
                  type:"postback",
                  title: "Help",
                  payload: "help"
                }
              ]
            }
          }
        }
      }
    });
    
  
  }

  //just in case buttons break
  buttons: [
    {
      type:"web_url",
      url: "https://www.thehotline.org/help/",
      title: "National Abuse Line"
    },
    {
      type:"web_url",
      url: "https://suicidepreventionlifeline.org",
      title: "Suicide Lifelife"
    }
  ]