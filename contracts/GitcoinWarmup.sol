pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "./tip3/interfaces/ITokenRoot.sol";
import "./tip3/interfaces/ITokenWallet.sol";
import "./tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "./tip3/interfaces/IAcceptTokensMintCallback.sol";

// реализовать калбеки
// external owner
// калбеки вынести в родительский контракт (сделать первым пунктом туториала)
// гитхаб экшны
// гайд:
// - создание аккаунта, обьяснение между внешними и внутренними вызовами
// - деплой токена и кошельков
// - трансферы, минты
// - контракт-владелец кошелька, калбеки
// - работа с газом: rawResreve, accept, flags
// - задача: сделать вариант со ставками (соотв. подготовить контракты чтоб было удобно это сделать)

contract GitcoinWarmup is RandomNonce, CheckPubKey, IAcceptTokensTransferCallback, IAcceptTokensMintCallback {
    uint128 constant deployBalance = 1 ever;
    uint128 constant msgFee = 0.5 ever;
    uint128 constant computeFee = 0.1 ever;

    uint8 constant maxPlayers = 5;
    uint8 constant maxBid = 10;
    uint128 constant reward = 1;


    address public static tokenRoot;

    address public tokenWallet;
    uint128 public balance;

    uint8 public nowPlayers;
    mapping (address => uint8) public bids;

    event gameResult (address[] _winners, int16 _winningDelta, uint8 _winningNumber);

    constructor() public checkPubKey {
        tvm.accept();
        ITokenRoot(tokenRoot).deployWallet{
            value: deployBalance + msgFee,
            flag: 2,
            callback: GitcoinWarmup.receiveTokenWalletAddress
        }(
            address(this),
            deployBalance
        );
    }

    function receiveTokenWalletAddress(address wallet) external {
        require(msg.sender == tokenRoot, 100, "Sender is not TokenRoot");
        tokenWallet = wallet;
    }

    function onAcceptTokensTransfer(
        address _tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override {
        require(msg.sender == tokenWallet, 101, "Sender is not TokenWallet");
        balance += amount;

        _tokenRoot;
        sender;
        senderWallet;
        remainingGasTo;
        payload;
    }

    function onAcceptTokensMint(
        address _tokenRoot,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) external override {
        require(msg.sender == tokenWallet, 101, "Sender is not token wallet");
        balance += amount;

        _tokenRoot;
        remainingGasTo;
        payload;
    }

    function placeBid(uint8 _number) external {
        require(_number <= maxBid, 200, "Bid more than the maximum");
        require(balance >= reward * maxPlayers, 201, "Insufficient funds to reward on the gaming contract");
        require(!bids.exists(msg.sender), 202, "You are already in the game!");

        tvm.rawReserve(20 ever, 2);
        
        bids[msg.sender] = _number;
        nowPlayers += 1;

        if (nowPlayers == maxPlayers)
            this.finishGame{value: 0, flag: 128}(msg.sender);
        else
            msg.sender.transfer({value: 0, flag: 128});
        
    }

    function finishGame(address gasTo) external {
        require(msg.sender == address(this), 203, "I can only be finished by message from me");
        tvm.rawReserve(20 ever, 2);
       
        (uint8 r, int16 winDelta, address[] winners) = _getWinners();
        balance -= reward * uint128(winners.length);
        for (address player: winners) {
            _payReward(reward, player);
        }
        delete nowPlayers;
        delete bids;
        emit gameResult(winners, winDelta, r);
        gasTo.transfer({value: 0, flag: 128});
    }

    function _getWinners() private returns (uint8 r, int16 winDelta, address[] winners) {
        rnd.shuffle();
        r = rnd.next(maxBid + 1);
        mapping(int16 => address[]) deltas;

        for ((address player, uint8 bid): bids) {
            int16 delta = math.abs(int16(bid) - int16(r));

            // mapping.add 
            bool deltaFirstSeen = deltas.add(delta, [player]);
            if (!deltaFirstSeen) {
                deltas[delta].push(player);
            }
        }
        optional(int16, address[]) min = deltas.min();
        if (min.hasValue())
            (winDelta, winners) = min.get();
    }

    function _payReward(uint128 amount, address to) private inline view {
        TvmCell _empty;
        ITokenWallet(tokenWallet).transfer{value: deployBalance + msgFee, flag: 2}({
            amount: amount, 
            recipient: to, 
            deployWalletValue: deployBalance, 
            remainingGasTo: address(this), 
            notify: true,
            payload: _empty
        });
    }
}
