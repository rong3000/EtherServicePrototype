//express

const express = require('express')
const path = require('path')

const PORT = process.env.PORT || 3000

const ethers = require("ethers");//chain specific
var bigNumber = ethers.BigNumber;//chain specific

const CONTRACT_ID = "0xF3BF07dc4A736f55C8F46711F66dD087d998b3Cf"; //chain specific
//to be changed after every contract deployed

const Contract = require('./MyToken.json');//chain specific

const url = "http://blockchain.my-neighbours.com:8545/";

const provider = new ethers.providers.JsonRpcProvider(url);//chain specific

let contract = new ethers.Contract(CONTRACT_ID, Contract.abi, provider);//read only; chain specific

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
            return JSON.stringify({
              'success': true
            })
          }
        })
      })

    }
  );
}

async function synchBalanceReturning(address, res) {
  contract.balanceOf(address).then( //check with chain what's user balance //chain specific
    (result) => {
      console.log('in synchBalanceReturning: show me the result of balance check', result._hex);
      let queryText = "UPDATE userwallet5 SET BALANCE = " + "\'" + result._hex + "\'" + " WHERE ADDRESS = " + "\'" + address + "\'" + " returning * ;";
      console.log("in synchBalanceReturning: query text is ", queryText);

      pool.connect((err, client, done) => {
        if (err) throw err
        client.query(queryText, (err, dbRes) => {
          done()
          if (err) {
            console.log(err.stack)
          } else {
            console.log('in synchBalanceReturning: Balance synch to db without error', dbRes.command, ' ', dbRes.rowCount);
            res.send(JSON.stringify({
              'username': dbRes.rows[0].username,
              'address': dbRes.rows[0].address,
              'balance': dbRes.rows[0].balance,
              'available balance': dbRes.rows[0].availbalance
            }));
          }
        })
      })

    }
  );
}

async function contractTransfer(signer, res, req, dbRes) {
  let contractWithSigner = new ethers.Contract(CONTRACT_ID, Contract.abi, signer);
  const tx = await contractWithSigner.transfer(dbRes.rows[1].address, req.body.amount);
  console.log('tx hash is ', tx.hash);
  let availableBalance = (bigNumber.from(dbRes.rows[0].availbalance).sub(bigNumber.from(req.body.amount)))._hex;
  res.send(JSON.stringify({
    'transSubmitted': "success",
    'transHash': tx.hash,
    'etherscan': "https://mumbai.polygonscan.com/tx/" + tx.hash,
    'sender_availBalance': availableBalance //initial availableBalance is the same as actual balance
  }));

  //write tx information into table TRANS_TEST
  pool.connect((err, client, done) => {
    if (err) {
      console.log('err is ', err);
    }

    client.query("INSERT INTO TRANS_TEST (TRANS_HASH, TRANS_STATUS, TRANS_AMOUNT, USER_ID) VALUES ($1::varchar, $2::int, $3::varchar, $4::int);",
      [tx.hash,
        0,
      req.body.amount,
      dbRes.rows[0].id
      ], (err, res) => {
        done()
        if (err) {
          console.log(err.stack)
        } else {
          console.log('data inserted into trans db are ', tx.hash,
            0,
            req.body.amount,
            dbRes.rows[0].id);
          console.log('inserted into Trans db without error', res.command, ' ', res.rowCount);
        }
      })
  })

  //immediately deduct tran amount from chain balance and then set in db availabe balance
  pool.connect((err, client, done) => {
    if (err) throw err
    client.query("UPDATE userwallet5 SET AVAILBALANCE = " + "\'" + availableBalance + "\'" + " WHERE ID = " + "\'" + dbRes.rows[0].id + "\'" + ";", (err, res) => {
      done()
      if (err) {
        console.log(err.stack)
      } else {
        console.log('updated availbalance into userwallet5 db without error', res.command, ' ', res.rowCount);
      }
    })
  })

  const receipt = await tx.wait();
  console.log('receipt is ', receipt);

  //write tx confirmation into table TRANS_TEST
  let queryText = "UPDATE TRANS_TEST SET TRANS_STATUS = " + "\'" + '1' + "\'" + " WHERE TRANS_HASH = " + "\'" + tx.hash + "\'" + ";";
  pool.connect((err, client, done) => {
    if (err) throw err
    client.query(queryText, (err, res) => {
      done()
      if (err) {
        console.log(err.stack)
      } else {
        console.log('updated trans_status without error', res.command, ' ', res.rowCount);
      }
    })
  })

  const synchSender = await synchBalance(dbRes.rows[0].address);
  console.log('synchSender result is ', synchSender);
  const synchReceiver = await synchBalance(dbRes.rows[1].address);
  console.log('synchReceiver result is ', synchReceiver);

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

  let queryText = "SELECT * FROM userwallet5 left join trans_test on (userwallet5.id = trans_test.user_id) WHERE username = " + "\'" + user + "\'" + ";";
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
          console.log('dbRes.rows', dbRes.rows);

          let b = [];
          let rows = dbRes.rows;

          for (row in rows) {
            console.log('row', row);

            let a =
            {
              'trans_hash': rows[row].trans_hash,
              'trans_status': rows[row].trans_status,
              'trans_amount': rows[row].trans_amount
            }
            b.push(a);
            console.log('a', a);
            console.log('b', b);
          }

          contract.balanceOf(dbRes.rows[0].address).then( //check with chain what's user balance //chain specific
            (result) => {
              console.log('in LOAD userwallet: show me the result of balance check', result._hex);
              res.send(JSON.stringify({
                'username': dbRes.rows[0].username,
                'address': dbRes.rows[0].address,
                'balance': result._hex,
                'available balance': dbRes.rows[0].availbalance,
                'trans': b
              }));

              if (result._hex != dbRes.rows[0].balance) {
                synchBalance(dbRes.rows[0].address);
              }
            }
          );          
        }
        else {
          console.log("user not in db, creating new user entry in db...");
          let randomWallet = ethers.Wallet.createRandom();
          console.log('username is ', user);
          console.log('address is ', randomWallet.address);
          console.log('private key is ', randomWallet.privateKey);

          pool.connect((err, client, done) => {
            if (err) throw err

            client.query("INSERT INTO userwallet5 (username, address, private, balance, availbalance) VALUES ($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar);",
              [user,
                randomWallet.address,
                randomWallet.privateKey,
                '0x0',
                '0x0'
              ], (err, res) => {
                done()
                if (err) {
                  console.log(err.stack);
                } else {
                  console.log('inserted without error', res.command, ' ', res.rowCount);
                }
              })
          })

          res.send(JSON.stringify({
            'username': user,
            'address': randomWallet.address,
            'balance': '0x0',
            'availbalance': '0x0'
          }));
        }
      }
    })
  })
})
app.get('/api/synchbalance/:username', function (req, res) {

  let user = req.params.username.toString();

  let queryText = "SELECT * FROM userwallet5 left join trans_test on (userwallet5.id = trans_test.user_id) WHERE username = " + "\'" + user + "\'" + ";";
  console.log("query text is ", queryText);
  //search db for where username exist
  pool.connect((err, client, done) => {
    if (err) throw err
    client.query(queryText, (err, dbRes) => {
      done()
      if (err) {
        console.log(err.stack)
      } else {
        synchBalanceReturning(dbRes.rows[0].address, res);
      }
    })
  })
})

app.post('/api/transfer/', function (req, res, next) {

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
          console.log("sender in db, public address is", dbRes.rows[0].address);

          console.log("receiver in db, public address is", dbRes.rows[1].address);
          if (dbRes.rows[0].availbalance < req.body.amount) {

            console.log("sender available balance is ", dbRes.rows[0].availbalance);
            console.log("sending amount is ", req.body.amount);

            res.send("Insuficient available balance.");

          } else {
            let signer = new ethers.Wallet(dbRes.rows[0].private, provider);
            contractTransfer(signer, res, req, dbRes);
          }
        }
        else {
          console.log('sender or receiver not in db');
          res.send('sender or receiver not in db');
        }
      }
    })
  })
})

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
})