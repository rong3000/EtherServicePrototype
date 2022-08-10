在库里面现在有两张表 USERWALLET5 和trans_test
一个表有用户钱包地址 钱包私钥 和余额 以及可用余额
另一个表是所有的交易信息，带有交易号，交易是否已经在链上确认，交易金额

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


数据格式
{
    "transferFrom": "admin",
    "transferTo": "ab",
    "amount": "0x10"
}

get api
https://protouserwallet.herokuapp.com/api/user/ + username
这个api现在可以返回用户所有交易信息，加上经过计算的可用余额，交易信息里面有链上确认和未链上确认的交易，未确认的部分就是可用余额和实际链上余额的差值


https://protouserwallet.herokuapp.com/api/synchbalance/ + username
这个api强制抓取链上余额并同步到db的余额，大部分时候用不上，因为交易一经确认已经有对应的逻辑把链上余额同步到db，但是如果一种情况是后台崩溃的时候会错过同步或者防止链上信息因为莫名其妙的原因没有被捕捉到
