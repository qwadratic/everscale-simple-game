pragma ton-solidity >= 0.47.0;
pragma AbiHeader expire;

interface TIP3TokenRoot {
    function name() external view responsible returns (string);

    function symbol() external view responsible returns (string);

    function decimals() external view responsible returns (uint8);

    function totalSupply() external view responsible returns (uint128);

    function walletCode() external view responsible returns (TvmCell);

    function rootOwner() external view responsible returns (address);

    function walletOf(address owner) external view responsible returns (address);

    function deployWallet(
        address owner,
        uint128 deployWalletValue
    ) external responsible returns (address);
}