pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "@broxus/tip3/contracts/interfaces/ITokenRoot.sol";
import "@broxus/tip3/contracts/interfaces/ITokenWallet.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensMintCallback.sol";
import "@broxus/tip3/contracts/interfaces/IBounceTokensTransferCallback.sol";
//import "@broxus/tip3/contracts/interfaces/IBounceTokensBurnCallback.sol";

import "@broxus/tip3/contracts/libraries/TokenMsgFlag.sol";


contract GitcoinWarmupBase is RandomNonce, IAcceptTokensTransferCallback, IAcceptTokensMintCallback, IBounceTokensTransferCallback {
    uint128 public reward;
    uint8 public maxPlayers;
    uint8 public maxBid;

    address public tokenRoot_;

    address public tokenWallet;
    uint128 public balance;
    uint8 public nowPlayers;
    mapping (address => uint8) public bids;

    event gameResult (address[] _winners, int16 _winningDelta, uint8 _winningNumber);

    modifier onlyTokenRoot() {
      require(msg.sender == tokenRoot_, 100, "Sender is not TokenRoot");
      _;
    }

    modifier onlyTokenWallet() {
      require(msg.sender == tokenWallet, 101, "Sender is not TokenWallet");
      _;
    }

    function receiveTokenWalletAddress(address wallet) external onlyTokenRoot {
        tokenWallet = wallet;
    }

    function onAcceptTokensTransfer(
        address _tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override onlyTokenWallet{
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
    ) external override onlyTokenWallet{
        balance += amount;

        _tokenRoot;
        remainingGasTo;
        payload;
    }

    function onBounceTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address revertedFrom
    ) public override {
        tvm.rawReserve(20 ever, 0);
        balance -= amount;
        tokenRoot;
        revertedFrom;
    }

    onBounce(TvmSlice body) external {
        tvm.rawReserve(20 ever, 2);

        uint32 functionId = body.decode(uint32);

        if (functionId == tvm.functionId(ITokenWallet.transfer)) {
            require(msg.sender == tokenWallet, 101);
            uint128 amount = body.decode(uint128);
            balance += amount;
        }
    }

}
