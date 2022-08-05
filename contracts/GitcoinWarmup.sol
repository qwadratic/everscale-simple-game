pragma ton-solidity >= 0.57.3;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/CheckPubKey.sol';

import "@broxus/tip3/contracts/interfaces/ITokenRoot.sol";
import "@broxus/tip3/contracts/interfaces/ITokenWallet.sol";

import "@broxus/tip3/contracts/libraries/TokenMsgFlag.sol";

import "./abstract/GitcoinWarmupBase.sol";
import "./libraries/GitcoinErrors.sol";

contract GitcoinWarmup is GitcoinWarmupBase, CheckPubKey {
    uint128 deployWalletBalance;

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
        tokenRoot_ = _tokenRoot;
        maxBid = _maxBid;
        deployWalletBalance = _deployWalletBalance;
        ITokenRoot(tokenRoot_).deployWallet{
            value: deployWalletBalance + msgFee,
            flag: TokenMsgFlag.IGNORE_ERRORS,
            callback: GitcoinWarmupBase.receiveTokenWalletAddress
        }(
            address(this),
            deployWalletBalance
        );
    }

    function placeBid(uint8 _number) external {
        require(_number <= maxBid, GitcoinErrors.BID_TOO_HIGH);
        require(balance >= reward * maxPlayers, GitcoinErrors.NOT_ENOUGH_GAME_BALANCE);
        require(!bids.exists(msg.sender), GitcoinErrors.ALREADY_IN_GAME);
        tvm.rawReserve(_reserve(), 2);

        bids[msg.sender] = _number;
        nowPlayers += 1;

        if (nowPlayers == maxPlayers)
            this.finishGame{value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED}(msg.sender);
        else
            msg.sender.transfer({value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED});
    }

    function finishGame(address gasTo) external {
        require(msg.sender == address(this), GitcoinErrors.NOT_SELF_CONTRACT);
        tvm.rawReserve(_reserve(), 2);

        (uint8 r, int16 winDelta, address[] winners) = _getWinners();
        balance -= reward * uint128(winners.length);
        for (address player: winners) {
            _payReward(reward, player);
        }
        delete nowPlayers;
        delete bids;
        emit gameResult(winners, winDelta, r);
        gasTo.transfer({value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED});
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
        ITokenWallet(tokenWallet).transfer{
            value: deployWalletBalance + msgFee,
            flag: TokenMsgFlag.IGNORE_ERRORS,
            bounce: true
            } ({
                amount: amount,
                recipient: to,
                deployWalletValue: deployWalletBalance,
                remainingGasTo: address(this),
                notify: true,
                payload: _empty
        });
    }
}
