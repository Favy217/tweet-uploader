// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TweetRecorder {
    struct Record {
        string tweetUrl;
        uint256 timestamp;
        address user;
        string discordUsername; // New field to store Discord username
    }

    // Mapping to store records for each user
    mapping(address => Record[]) public userRecords;
    // Total count of records (for global reference if needed)
    uint256 public recordCount;

    // Event to log new records
    event TweetRecorded(address indexed user, string tweetUrl, string discordUsername, uint256 timestamp);

    // Function to record a tweet with Discord username
    function recordTweet(string memory _tweetUrl, string memory _discordUsername) external {
        require(bytes(_tweetUrl).length > 0, "Tweet URL cannot be empty");
        require(bytes(_discordUsername).length > 0, "Discord username cannot be empty");

        userRecords[msg.sender].push(Record(_tweetUrl, block.timestamp, msg.sender, _discordUsername));
        recordCount++;
        emit TweetRecorded(msg.sender, _tweetUrl, _discordUsername, block.timestamp);
    }

    // Function to get records for a specific user
    function getUserRecords(address _user) external view returns (Record[] memory) {
        return userRecords[_user];
    }

    // Function to get total record count
    function getRecordCount() external view returns (uint256) {
        return recordCount;
    }

    // Function to check if a URL is recorded (for uniqueness)
    mapping(string => bool) public recordedUrls;

    function isUrlRecorded(string memory _tweetUrl) external view returns (bool) {
        return recordedUrls[_tweetUrl];
    }
}
