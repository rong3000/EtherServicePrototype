In the database, there are currently two tables, USERWALLET5 and trans_test. One table contains user wallet addresses, wallet private keys, balances, and available balances. The other table contains all transaction information, including transaction ID, whether the transaction has been confirmed on the blockchain, and transaction amount.

                                      Table "public.userwallet5"
    Column    |         Type          | Collation | Nullable |                 Default
--------------+-----------------------+-----------+----------+-----------------------------------------
 id           | integer               |           | not null | nextval('userwallet5_id_seq'::regclass)
 username     | character varying(36) |           | not null |
 address      | character varying(42) |           | not null |
 private      | character varying(66) |           | not null |
 balance      | character varying(36) |           | not null |
 availbalance | character varying(36) |           | not null |
Indexes:
    "userwallet5_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "trans_test" CONSTRAINT "trans_test_user_id_fkey" FOREIGN KEY (user_id) REFERENCES userwallet5(id)

                                         Table "public.trans_test"
    Column    |         Type          | Collation | Nullable |                   Default
--------------+-----------------------+-----------+----------+----------------------------------------------
 trans_id     | integer               |           | not null | nextval('trans_test_trans_id_seq'::regclass)
 trans_hash   | character varying(66) |           | not null |
 trans_status | integer               |           | not null |
 trans_amount | character varying(36) |           | not null |
 user_id      | integer               |           |          |
Indexes:
    "trans_test_pkey" PRIMARY KEY, btree (trans_id)
Foreign-key constraints:
    "trans_test_user_id_fkey" FOREIGN KEY (user_id) REFERENCES userwallet5(id)

post api
https://protouserwallet.herokuapp.com/api/transfer/


data format
{
    "transferFrom": "admin",
    "transferTo": "ab",
    "amount": "0x10"
}

get api
https://protouserwallet.herokuapp.com/api/user/ + username
This API can currently return all transaction information for a user, along with the calculated available balance. The transaction information includes both confirmed and unconfirmed transactions. The unconfirmed portion represents the difference between the available balance and the actual balance on the blockchain.

The API endpoint is as follows: https://protouserwallet.herokuapp.com/api/synchbalance/ + username

This API is designed to forcibly fetch the on-chain balance and synchronize it with the balance in the database. Most of the time, this API is not needed because once a transaction is confirmed, there is corresponding logic to synchronize the on-chain balance with the database. However, there are situations where this API can be useful, such as when a backend crash occurs, which may result in missing synchronization, or to prevent scenarios where on-chain information is not captured for unexplained reasons.

