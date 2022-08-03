pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import '@broxus/contracts/contracts/access/ExternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';


/*
    @title Simple externally owned contract
    @dev Allows to interact with any smart contract by sending an internal messages
    or simply transfer TONs
*/
contract Account is ExternalOwner, RandomNonce, CheckPubKey {
    constructor() public checkPubKey {
        tvm.accept();

        setOwnership(msg.pubkey());
    }

    /*
        @notice Send transaction to another contract
        @param dest Destination address
        @param value Amount of attached TONs
        @param bounce Message bounce
        @param flags Message flags
        @param payload Tvm cell encoded payload, such as method call
    */
    function sendTransaction(
        address dest,
        uint128 value,
        bool bounce,
        uint8 flags,
        TvmCell payload
    )
        public
        view
        onlyOwner
    {
        tvm.accept();

        dest.transfer(value, bounce, flags, payload);
    }
}
