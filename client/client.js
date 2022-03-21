const https = require("https");
const http = require("http");

//server params
const HOST_NAME = "localhost";
const PORT = 8080;

// Base delay milliseconds before sending (for Exponential backoff)
const SLOT_TIME = 100;

// for request statistics collect
const requestStatistic = {
  requests: 0,
  ok: 0,
  error500: 0,
  hang: 0,
};

// id generator
const pingIdHelper = (function () {
  let pingId = 0;
  return {
    getNext: () => {
      return ++pingId;
    },
    reset: () => (pingId = 0),
  };
})();

class PingData {
  constructor(responseTime, date) {
    this.pingId = pingIdHelper.getNext();
    this.deliveryAttemp = 0;
    this.responseTime = responseTime;
    this.date = date;
  }
  addDeliveryAttemp() {
    return ++this.deliveryAttemp;
  }
}

// start client logic func - getting ping and send it to server
setInterval(() => {
  const startDate = new Date();
  // getting ping
  https
    .get("https://fundraiseup.com/", (res) => {
      const ping = new Date() - startDate;

      //create pingData and send it to server
      const pingData = new PingData(ping, startDate);
      sendPingDataToServer(pingData);
    })
    .on("error", (err) => {
      console.log("Error: ", err.message);
    });
}, 1000);

// send pingData to server handler
function sendPingDataToServer(pingData) {
  // New DeliveAttempt
  pingData.addDeliveryAttemp();

  // Logging sending pingData
  console.log("Sending... :" + JSON.stringify(pingData));
  const post_data = JSON.stringify(pingData);

  const options = {
    hostname: HOST_NAME,
    port: PORT,
    path: "/data",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": post_data.length,
    },
  };

  //new request to server - collecting data for statistics
  requestStatistic.requests++;

  const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode} | ${res.statusMessage}`);

    // if error 500 - Try to send it again.
    switch (res.statusCode) {
      case 200:
        // Collecting data for statistics
        requestStatistic.ok++;
        break;
      case 500:
        requestStatistic.error500++;
        // Try to send request again.
        setTimeout(
          () => sendPingDataToServer(pingData),
          gettingNextTimeBackoff(pingData.deliveryAttemp + 1)
        );
        break;
      default:
        break;
    }
  });

  // connection abort after 10s hang
  req.setTimeout(10000, () => {
    // Collecting data for statistics
    requestStatistic.hang++;

    req.destroy();
    console.log("Connection aborted");

    // Try to send request again.
    setTimeout(
      () => sendPingDataToServer(pingData),
      gettingNextTimeBackoff(pingData.deliveryAttemp + 1)
    );
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.write(post_data);
  req.end();
}

// Exponential backoff alghorithm - return delay time
function gettingNextTimeBackoff(deliveryAttemp) {
  // 10 is the highest power to avoid too much delay
  if (deliveryAttemp > 10) deliveryAttemp = 10;

  // Math.random() does not include the top value, so 1 is not subtracted from maxTimes.
  const maxTimes = Math.pow(2, deliveryAttemp);
  return Math.round(Math.random() * maxTimes) * SLOT_TIME;
}

// close client handler
process.on("SIGINT", () => {
  console.log("SIGINT signal received...");
  console.log(`Request statistic: 
		Requests sent - ${requestStatistic.requests} 
		OK requests: - ${requestStatistic.ok}
		Error 500 requests: - ${requestStatistic.error500}
		Hanging aborted requests: - ${requestStatistic.hang}`);
  console.log("Client closed.");
  process.exit(0);
});
