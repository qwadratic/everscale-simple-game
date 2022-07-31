pragma ton-solidity >= 0.47.0;
pragma AbiHeader expire;

interface TIP3TokenWallet {
    function root() external view responsible returns (address);

    function balance() external view responsible returns (uint128);

    function walletCode() external view responsible returns (TvmCell);

    function owner() external view responsible returns (address);

    function acceptTransfer(
        uint128 amount,
        address sender,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external functionID(0x67A0B95F);

    function transfer(
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;

    function transferToWallet(
        uint128 amount,
        address recipientTokenWallet,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;
}