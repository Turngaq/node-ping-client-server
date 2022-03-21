const http = require("http");

// Server params
const HOST = "localhost";
const PORT = 8080;

// Structure to store received data
const pingDataList = [];

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} ${new Date()}`);

  if (req.method === "POST" && req.url === "/data") {
    // roll how the server responds
    const chance = Math.random() * 10;

    if (chance > 3) {
      // 60% that the server responds OK
      console.log("Server responds OK.");

      let data = "";
      req.on("data", (chunk) => {
        data += chunk.toString();
      });

      req.on("end", () => {
        data = JSON.parse(data);
        // logging received data
        console.log(data);
        pingDataList.push(data);

        res.writeHead(200);
        res.end();
      });
    } else if (chance > 1) {
      // 20% that the server responds error
      console.log("Server error simulation.");

      res.writeHead(500);
      res.end();
    } else {
      // 20% that the server will not respond
      console.log("Server hang simulation.");
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`server started on ${HOST}:${PORT}`);
});

// find rounded Mean value ping in collected pingData
function getMeanPing(pingDataList) {
  return Math.round(
    pingDataList.reduce((sum, el) => sum + el.responseTime, 0) /
      pingDataList.length
  );
}

// find Median value ping in collected pingData
function getMedianPing(pingDataList) {
  // converting an array to a set to find unique ones and back to an array
  pingUniqSortedArr = [
    ...new Set(pingDataList.map((el) => el.responseTime).sort()),
  ];

  return pingUniqSortedArr[Math.floor(pingUniqSortedArr.length / 2)];
}

// close server handler
process.on("SIGINT", () => {
  console.log("SIGINT signal received.");
  if (pingDataList.length == 0) {
    console.log("No ping data.");
  } else {
    console.log(`
		Ping mean value: ${getMeanPing(pingDataList)} 
		Ping median value: ${getMedianPing(pingDataList)}
	`);
  }
  console.log("Server closed.");
  process.exit(0);
});
