// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../TweetRecorder.sol";

contract DeployTweetRecorder is Script {
    function run() external {
	uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        TweetRecorder tweetRecorder = new TweetRecorder();

        console.log("TweetRecorder deployed at:", address(tweetRecorder));

        vm.stopBroadcast();
    }
}
