pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import "./tip3/interfaces/IAcceptTokensTransferCallback.sol";
import "./tip3/interfaces/IAcceptTokensMintCallback.sol";
import "./interfaces/TIP3TokenRoot.sol";
import "./interfaces/TIP3TokenWallet.sol";

contract GitcoinWarmup is CheckPubKey, IAcceptTokensTransferCallback, IAcceptTokensMintCallback {
    uint128 private transferGas = 0.8 ever;
    uint128 public reward;
    uint128 public balance;

    uint16 static _nonce;
    uint16 constant maxBid = 100;
    uint16 public maxPlayers;

    address[10] public players;
    address public tokenWallet;
    address public tokenRoot;

    uint16[10] private bidArray;

    mapping (address => uint16) public bids;

    event gameResult (address[10] _winners, uint16 _winningNumber);
    event deploymentWinnerWallet (address _winnerWallet);

    constructor(
        uint128 _deployWalletValue,
        uint128 _reward,
        uint16 _maxPlayers,
        address _tokenRoot
    ) public checkPubKey {
        tvm.accept();
        reward = _reward;
        maxPlayers = _maxPlayers;
        tokenRoot = _tokenRoot;

        deployWallet(_deployWalletValue);
    }

    function deployWallet(uint128 _deployWalletValue) private view {
        TIP3TokenRoot(tokenRoot).deployWallet{
            value: _deployWalletValue + 2 ever,
            flag: 1,
            callback: GitcoinWarmup.receiveTokenWalletAddress
        }(
            address(this),
            _deployWalletValue
        );
    }

    function _deployUserWallet(address _owner) private view {
        TIP3TokenRoot(tokenRoot).deployWallet{
            value: 2 ever,
            flag: 1,
            callback: GitcoinWarmup.receiveWinnerWallet
        }(
            _owner,
            1 ever
        );
    }

    function receiveTokenWalletAddress(
        address wallet
    ) external {
        require(msg.sender == tokenRoot, 100, "Sender is not token root");
        tokenWallet = wallet;
        TIP3TokenWallet(wallet).balance{
            value: transferGas,
            flag: 0,
            callback: GitcoinWarmup.receiveTokenBalance}();
    }

    function receiveWinnerWallet(
        address _wallet
    ) external view {
        require(msg.sender == tokenRoot, 100, "Sender is not token root");
        emit deploymentWinnerWallet(_wallet);
    }

    function receiveTokenBalance(uint128 _balance) external {
        require(msg.sender == tokenWallet, 101, "Sender is not token wallet");
        balance = _balance;
    }

    function placeBid(uint16 _number) external {
        require(balance >= reward, 42, "Insufficient funds to reward on the gaming contract");
        require(_number <= maxBid, 202, "Bid more than the maximum");
        require(!_existsBid(msg.sender), 201, "You are already in the game!");
        tvm.rawReserve(_reserve(), 0);
        players.push(msg.sender);
        bids[msg.sender] = _number;
        bidArray.push(_number);

        if (players.length == maxPlayers) _finishGame();
    }

    function onAcceptTokensTransfer(
        address _tokenRoot,
        uint128 _amount,
        address _sender,
        address _senderWallet,
        address _remainingGasTo,
        TvmCell _payload
    ) external override {
        require(msg.sender == tokenWallet, 101, "Sender is not Token Wallet");
        balance += _amount;

        _payload;
        _remainingGasTo;
        _tokenRoot;
        _senderWallet;
        _sender;
    }

    function onAcceptTokensMint(
        address _tokenRoot,
        uint128 _amount,
        address _remainingGasTo,
        TvmCell _payload
    ) external override {
        require(msg.sender == tokenWallet, 101, "Sender is not Token Wallet");
        balance += _amount;
        _payload;
        _remainingGasTo;
        _tokenRoot;
    }

    function _finishGame() private {
        address[] winners;
        uint16 winningNumber = _getWinnerNumber();
        for (uint i = 0; i < players.length; i++) {
            if (bids[players[i]] == winningNumber ) winners.push(players[i]);
        }
        _payReward(winners);

        players = new address[](10);
        bidArray = new uint16[](10);

        emit gameResult(winners, winningNumber);
    }

    function _getWinnerNumber() private view returns (uint16) {
        rnd.shuffle();
        uint16 randomNum = rnd.next(maxBid + 1);

        uint16 winningNumber = bidArray[0];
        for (uint i = 0; i < bidArray.length; i++) {
            if (math.abs(bidArray[i] - randomNum) < math.abs(winningNumber - randomNum))
                winningNumber = bidArray[i];
        }
        return winningNumber;
    }

    function _existsBid(address _addr) private view returns (bool) {
        for (uint i = 0; i < players.length; i++) {
            if (players[i] == _addr) {
                return true;
            }
        }
        return false;
    }

    function _payReward(address[] recipients) private {
        TIP3TokenWallet wallet = TIP3TokenWallet(tokenWallet);
        TvmCell _empty;
        uint128 amount = uint128(reward / recipients.length);
        for (uint128 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            _deployUserWallet(recipient);
            wallet.transfer{value: transferGas, flag: 0}(amount, recipient, 0 ever, address(this), false, _empty);
            balance -= amount;
        }
    }

    function _reserve() private view returns (uint128) {
        return math.max(address(this).balance - msg.value, transferGas);
    }
}
