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

async function checkAvail(dbRes, res) {
  try {
    let b = [];

    let pendingAmount = bigNumber.from('0x0');
    let avail = bigNumber.from('0x0');

    const chainBal = await contract.balanceOf(dbRes.rows[0].address);
    console.log('chainBal is ', chainBal);

    for (row in dbRes.rows) {
      let a =
      {
        'trans_hash': dbRes.rows[row].trans_hash,
        'trans_status': dbRes.rows[row].trans_status,
        'trans_amount': dbRes.rows[row].trans_amount
      }
      b.push(a);
      console.log(dbRes.rows[row].trans_hash);
      console.log(dbRes.rows[row].trans_status);
      if (dbRes.rows[row].trans_hash != null) {
        if (dbRes.rows[row].trans_status != 0 || dbRes.rows[row].trans_status != 1) {

          let txReceipt = await provider.getTransactionReceipt(dbRes.rows[row].trans_hash);
          console.log('2 and txReceipt is ', txReceipt);
          if (txReceipt == null) {
            pendingAmount = pendingAmount.add(bigNumber.from(dbRes.rows[row].trans_amount))
            console.log('pendingAmount is ', pendingAmount);
            console.log('actual bal is ', chainBal);
          }
        }
      }
    }

    avail = chainBal.sub(pendingAmount);
            console.log('3');
            console.log('avail is ', avail);

    res.send(JSON.stringify({
      'username': dbRes.rows[0].username,
      'address': dbRes.rows[0].address,
      'balance': chainBal._hex,
      'available balance': avail._hex,
      'trans': b
    }));

  } catch (error) {
    console.log(error);
    res.send(JSON.stringify({
      'transSubmitted': "fail",
      'error reason': error.reason,
      'error code': error.code
    }));
  }




}


async function checkBeforeTransfer(dbResInFunc, res, req, receiver) {
  try {
    let pendingAmount = bigNumber.from('0x0');;
    let avail = bigNumber.from('0x0');

    let chainBal = await contract.balanceOf(dbResInFunc.rows[0].address);
    console.log('chainBal is ', chainBal);

    for (row in dbResInFunc.rows) {
      console.log('dbResInFunc.rows[row].trans_hash', dbResInFunc.rows[row].trans_hash);
      if (dbResInFunc.rows[row].trans_hash != null) {
        console.log('dbResInFunc.rows[row].trans_status', dbResInFunc.rows[row].trans_status);
        if (dbResInFunc.rows[row].trans_status != 0 || dbResInFunc.rows[row].trans_status != 1) {
          let txReceipt = await provider.getTransactionReceipt(dbResInFunc.rows[row].trans_hash);
          console.log('txReceipt is ', txReceipt);
          if (txReceipt == null) {
            pendingAmount = pendingAmount.add(bigNumber.from(dbResInFunc.rows[row].trans_amount))
            console.log("pending", pendingAmount);
          }
        }
      }
    }

    
    console.log('dbResInFunc.rows[0]', dbResInFunc.rows[0]);
    
    avail = chainBal.sub(pendingAmount);
    console.log('avail is ', avail);

    if (avail.lt(bigNumber.from(req.body.amount))) {

      res.send(JSON.stringify({
        'balance': chainBal._hex,
        'available balance': avail._hex,
        'attempted transfer amount': req.body.amount,
        'trans submitted': "fail",
        'if fail reason': "Insuficient available balance"
      }));
    } else {
      let signer = new ethers.Wallet(dbResInFunc.rows[0].private, provider);
      contractTransfer(signer, res, req, dbResInFunc, receiver);
    }


  } catch (error) {
    console.log(error);
    res.send(JSON.stringify({
      'transSubmitted': "fail",
      'error reason': error.reason,
      'error code': error.code
    }));

  }



}

async function contractTransfer(signer, res, req, dbRes, receiver) {
  let contractWithSigner = new ethers.Contract(CONTRACT_ID, Contract.abi, signer);
  try {
    const tx = await contractWithSigner.transfer(receiver, req.body.amount);
    let availableBalance = (bigNumber.from(dbRes.rows[0].availbalance).sub(bigNumber.from(req.body.amount)))._hex;
    res.send(JSON.stringify({
      'transSubmitted': "success",
      'transHash': tx.hash,
      'etherscan': "https://mumbai.polygonscan.com/tx/" + tx.hash
      // 'sender_availBalance': availableBalance //initial availableBalance is the same as actual balance
    }));

    //write tx information into table TRANS_TEST
    pool.connect((err, client, done) => {
      if (err) {
        console.log('err is ', err);
      }

      client.query("INSERT INTO TRANS_TEST (TRANS_HASH, TRANS_STATUS, TRANS_AMOUNT, USER_ID) VALUES ($1::varchar, $2::int, $3::varchar, $4::int);",
        [tx.hash,
          2,
        req.body.amount,
        dbRes.rows[0].id
        ], (err, res) => {
          done()
          if (err) {
            console.log(err.stack)
          } else {
            console.log('data inserted into trans db are ', tx.hash,
              2,
              req.body.amount,
              dbRes.rows[0].id);
            console.log('inserted into Trans db without error', res.command, ' ', res.rowCount);
          }
        })
    })

    const receipt = await tx.wait();
    console.log('receipt is ', receipt);

    //write tx confirmation into table TRANS_TEST
    let queryText = "UPDATE TRANS_TEST SET TRANS_STATUS = " + "\'" + receipt.status + "\'" + " WHERE TRANS_HASH = " + "\'" + tx.hash + "\'" + ";";
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
  } catch (error) {
    console.log(error);
    res.send(JSON.stringify({
      'transSubmitted': "fail",
      'error reason': error.reason,
      'error code': error.code
    }));
  }
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

          checkAvail(dbRes, res);

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

          let queryText = "SELECT * FROM userwallet5 left join trans_test on (userwallet5.id = trans_test.user_id) WHERE username = " + "\'" + req.body.transferFrom + "\'" + ";";
          console.log("query text for sender is ", queryText);

          pool.connect((err, client, done) => {
            if (err) throw err
            client.query(queryText, (err, dbResInFunc) => {
              done()
              if (err) {
                console.log(err.stack)
              } else {

                if (dbResInFunc.rowCount > 0) {

                  console.log('sender in db');
                  checkBeforeTransfer(dbResInFunc, res, req, dbRes.rows[1].address)

                }
                else {
                  res.send('sender not in db');
                }

              }
            })
          })





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