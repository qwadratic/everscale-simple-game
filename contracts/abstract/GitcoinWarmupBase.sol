pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "@broxus/tip3/contracts/interfaces/ITokenWallet.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "@broxus/tip3/contracts/interfaces/IAcceptTokensMintCallback.sol";
import "@broxus/tip3/contracts/interfaces/IBounceTokensTransferCallback.sol";

import "../libraries/GitcoinErrors.sol";
import "locklift/src/console.sol";

contract GitcoinWarmupBase is RandomNonce, IAcceptTokensTransferCallback, IAcceptTokensMintCallback, IBounceTokensTransferCallback {
    uint128 constant msgFee = 0.5 ever;
    uint128 constant computeFee = 0.1 ever;
    uint128 public reward;
    uint8 public maxPlayers;
    uint8 public maxBid;

    address public tokenRoot_;
    address public hiy;
    address public ki;
    address public tokenWallet;
    uint128 public balance;
    uint8 public nowPlayers;
    mapping (address => uint8) public bids;

    event gameResult (address[] _winners, int16 _winningDelta, uint8 _winningNumber);

    modifier onlyTokenRoot() {
      require(msg.sender == tokenRoot_, GitcoinErrors.NOT_TOKEN_ROOT);
      _;
    }

    modifier onlyTokenWallet() {
      require(msg.sender == tokenWallet, GitcoinErrors.NOT_TOKEN_WALLET);
      _;
    }

    function _reserve() public view returns(uint128 reserve){
        return msgFee + computeFee * maxPlayers;
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
        require(msg.sender == tokenWallet, GitcoinErrors.NOT_TOKEN_WALLET);
        tvm.accept();
        balance += amount;
        revertedFrom;
        tokenRoot;
        revertedFrom;
    }

    onBounce(TvmSlice body) external {
        tvm.rawReserve(_reserve(), 2);

        uint32 functionId = body.decode(uint32);

        if (functionId == tvm.functionId(ITokenWallet.transfer)) {
            require(msg.sender == tokenWallet, 101);
            uint128 amount = body.decode(uint128);
            balance += amount;
        }
    }

}
