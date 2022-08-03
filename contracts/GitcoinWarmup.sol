pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "@broxus/tip3/contracts/interfaces/ITokenRoot.sol";
import "@broxus/tip3/contracts/interfaces/ITokenWallet.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensMintCallback.sol";

contract GitcoinWarmup is RandomNonce, CheckPubKey, IAcceptTokensTransferCallback, IAcceptTokensMintCallback {
    uint128 constant msgFee = 0.5 ever;
    uint128 constant computeFee = 0.1 ever;
    uint128 deployWalletBalance;
    uint128 public reward;
    uint8 public maxPlayers;
    uint8 public maxBid;

    address public tokenRoot;

    address public tokenWallet;
    uint128 public balance;

    uint8 public nowPlayers;
    mapping (address => uint8) public bids;

    event gameResult (address[] _winners, int16 _winningDelta, uint8 _winningNumber);

    constructor(
        uint128 _deployWalletBalance,
        uint128 _reward,
        uint8 _maxPlayers,
        uint8 _maxBid,
        address _tokenRoot
    ) public checkPubKey {
        tvm.accept();
        reward = _reward;
        maxPlayers = _maxPlayers;
        tokenRoot = _tokenRoot;
        maxBid = _maxBid;
        deployWalletBalance = _deployWalletBalance;
        ITokenRoot(tokenRoot).deployWallet{
            value: deployWalletBalance + msgFee,
            flag: 2,
            callback: GitcoinWarmup.receiveTokenWalletAddress
        }(
            address(this),
            deployWalletBalance
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

    function _getWinners() private view returns (uint8 r, int16 winDelta, address[] winners) {
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
        ITokenWallet(tokenWallet).transfer{value: deployWalletBalance + msgFee, flag: 2}({
            amount: amount,
            recipient: to,
            deployWalletValue: deployWalletBalance,
            remainingGasTo: address(this),
            notify: true,
            payload: _empty
        });
    }
}
