//express

const express = require('express')
const path = require('path')

const PORT = process.env.PORT || 3000

const ethers = require("ethers");//chain specific
var bigNumber = ethers.BigNumber;//chain specific

let contract;//chain specific
const CONTRACT_ID = "0x74Dc9e5beeF3D9ee614E6016aBA19c058B4D0c20"; //chain specific
//to be changed after every contract deployed

const Contract = require('./MyToken.json');//chain specific

const url = "https://polygon-mumbai.g.alchemy.com/v2/8_ArLwNTuvxrIAhPvAq9xBxRel3zc1pj";//chain specific
const provider = new ethers.providers.JsonRpcProvider(url);//chain specific

contract = new ethers.Contract(CONTRACT_ID, Contract.abi, provider);//read only; chain specific
// contractWithSigner = contract.connect(signer);//writable; chain specific
// contractWithSigner.transfer('addres', '0x100');

const app = express()
  .set('port', PORT)
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

app.all('*', function (req, res, next) {
  // res.header('Access-Control-Allow-Origin','https://poos.io'); //当允许携带cookies此处的白名单不能写’*’
  // res.header('Access-Control-Allow-Origin','http://localhost:5000'); //当允许携带cookies此处的白名单不能写’*’
  res.header('Access-Control-Allow-Origin', '*'); //当允许携带cookies此处的白名单不能写’*’
  res.header('Access-Control-Allow-Headers', 'content-type,Content-Length, Authorization,Origin,Accept,X-Requested-With'); //允许的请求头
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT'); //允许的请求方法
  // res.header('Access-Control-Allow-Credentials',true);  //允许携带cookies
  next();
});

// Static public files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

async function synchBalance(address) {
  contract.balanceOf(address).then( //check with chain what's user balance //chain specific
    (result) => {
      console.log('in synchBalance: show me the result of balance check', result._hex);
      let queryText = "UPDATE userwallet5 SET BALANCE = " + "\'" + result._hex + "\'" + " WHERE ADDRESS = " + "\'" + address + "\'" + ";";
      console.log("in synchBalance: query text is ", queryText);

      pool.connect((err, client, done) => {
        if (err) throw err
        client.query(queryText, (err, res) => {
          done()
          if (err) {
            console.log(err.stack)
          } else {
            console.log('in synchBalance: Balance synch to db without error', res.command, ' ', res.rowCount);
          }
        })
      })
    }
  );
}


app.get('/', function (req, res) {
  res.send('Managing user wallets');
})

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: "postgres://aqnimfmyookfrc:1ed2357a4d5bf2826a3a9822a4d54a97be5bf43acdbe570b6ae9ccdbf3d7942b@ec2-107-22-122-106.compute-1.amazonaws.com:5432/ddrrkuok65vpk5",
  ssl: {
    rejectUnauthorized: false
  }
});

app.get('/api/user/:username', function (req, res) {

  let user = req.params.username.toString();

  let queryText = "SELECT * FROM userwallet5 WHERE username = " + "\'" + user + "\'" + ";";
  console.log("query text is ", queryText);
  //search db for where username exist
  pool.connect((err, client, done) => {
    if (err) throw err
    client.query(queryText, (err, dbRes) => {
      done()
      if (err) {
        console.log(err.stack)
      } else {
        if (dbRes.rowCount > 0) {
          console.log("user in db");
          console.log('dbRes.rows[0]', dbRes.rows[0]);
          res.send(JSON.stringify({
            'username': dbRes.rows[0].username,
            'address': dbRes.rows[0].address,
            'balance': dbRes.rows[0].balance
          }));
        }
        else {
          console.log("user not in db, creating new user entry in db...");
          let randomWallet = ethers.Wallet.createRandom();
          console.log('username is ', user);
          console.log('address is ', randomWallet.address);
          console.log('private key is ', randomWallet.privateKey);
          pool.connect((err, client, done) => {
            if (err) throw err

            client.query("INSERT INTO userwallet5 (username, address, private, balance) VALUES ($1::varchar, $2::varchar, $3::varchar, $4::varchar);",
              [user,
                randomWallet.address,
                randomWallet.privateKey,
                '0x0'
              ], (err, res) => {
                done()
                if (err) {
                  console.log(err.stack)
                } else {
                  console.log('inserted without error', res.command, ' ', res.rowCount);
                }
              })
          })

          res.send(JSON.stringify({
            'username': user,
            'address': randomWallet.address,
            'balance': '0x0'
          }));
        }
      }
    })
  })
})

app.post('/api/transer/', function (req, res, next) {

  let queryText = "SELECT * FROM userwallet5 WHERE username = " + "\'" + req.body.transferFrom + "\'" + "\n"
    + "UNION ALL" + "\n"
    + "SELECT * FROM userwallet5 WHERE username = " + "\'" + req.body.transferTo + "\'";
  console.log("query text is ", queryText);
  pool.connect((err, client, done) => {
    if (err) throw err
    client.query(queryText, (err, dbRes) => {
      done()
      if (err) {
        console.log(err.stack)
      } else {
        if (dbRes.rowCount == 2) {
          // console.log("sender in db, private key is", dbRes.rows[0].private);
          console.log("sender in db, private key is", dbRes.rows[0].private);
          console.log("sender in db, public address is", dbRes.rows[0].address);
          console.log("receiver in db, public address is", dbRes.rows[1].address);
          console.log("req.body.amount", req.body.amount);

          let signer = new ethers.Wallet(dbRes.rows[0].private, provider);//chain specific
          // let contractWithSigner = contract.connect(signer, provider);//writable; chain specific
          let contractWithSigner = new ethers.Contract(CONTRACT_ID, Contract.abi, signer);//writable; chain specific
          contractWithSigner.transfer(dbRes.rows[1].address, req.body.amount).then(
            (result) => {
              console.log('result is ', result);
              // return result.wait;
            },
            (error) => {
              console.log('error', error.error.message);
              errorCaught = true;
            }
          ).then(
            () => {
              synchBalance(dbRes.rows[0].address);
              synchBalance(dbRes.rows[1].address).then(
                () => {
                  let queryTextPostTransfer = "SELECT * FROM userwallet5 WHERE username = " + "\'" + dbRes.rows[1].username + "\'" + ";";
                  console.log("after synch: query text post transfer is ", queryTextPostTransfer);
                  //search db for where username exist
                  pool.connect((err, client, done) => {
                    if (err) throw err
                    client.query(queryTextPostTransfer, (err, dbRes) => {
                      done()
                      if (err) {
                        console.log(err.stack)
                      } else {
                        if (dbRes.rowCount > 0) {
                          console.log("after synch: user in db");
                          console.log('after synch: dbRes.rows[0]', dbRes.rows[0]);
                          res.send(JSON.stringify({
                            'after synch': 'yes',
                            'username': dbRes.rows[0].username,
                            'address': dbRes.rows[0].address,
                            'balance': dbRes.rows[0].balance
                          }));
                        }
                      }
                    })
                  })
                }
              );



            }
          );
        }
        else {
          console.log('sender or receiver not in db')
        }
      }
    })
  })



})

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
})