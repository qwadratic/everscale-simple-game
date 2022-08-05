pragma ton-solidity >= 0.57.0;

library GitcoinErrors {

    uint16 constant NOT_TOKEN_ROOT                                  = 100;
    uint16 constant NOT_TOKEN_WALLET                                = 101;
    uint16 constant NOT_SELF_CONTRACT                               = 102;

    uint16 constant BID_TOO_HIGH                                    = 200;
    uint16 constant NOT_ENOUGH_GAME_BALANCE                         = 201;
    uint16 constant ALREADY_IN_GAME                                 = 202;

}
