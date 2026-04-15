// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================
// MONDEGA DIGITAL — Multi-Coin Smart Contract System
//
// Architecture: One factory contract deploys individual
// ERC-20 contracts per digital coin. Each coin is:
//   - Pegged 1:1 to its national fiat
//   - Mintable only by the Mondega treasury (when user buys)
//   - Burnable only by the Mondega treasury (when user sells)
//   - Pausable for emergencies
//   - Blacklistable for AML compliance
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MondegaCoin
 * @notice A single digital coin in the Mondega ecosystem (e.g. QUETZA, MEXCOIN)
 * @dev ERC-20 with mint/burn controlled by treasury, compliance blacklist, and pausability
 */
contract MondegaCoin is ERC20, ERC20Pausable, ERC20Burnable, AccessControl, ReentrancyGuard {

    // ---- Roles ----
    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE     = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE     = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ---- State ----
    string  public coinCode;          // e.g. "QUETZA"
    string  public fiatPeg;           // e.g. "GTQ"
    string  public country;           // e.g. "Guatemala"
    uint8   public constant DECIMALS  = 2; // Like fiat currencies

    // AML compliance blacklist
    mapping(address => bool) private _blacklisted;

    // Supply caps (set per coin based on regulatory requirements)
    uint256 public maxSupply;

    // ---- Events ----
    event Blacklisted(address indexed account, address indexed by, string reason);
    event Unblacklisted(address indexed account, address indexed by);
    event Minted(address indexed to, uint256 amount, string txRef);
    event Burned(address indexed from, uint256 amount, string txRef);
    event MaxSupplyUpdated(uint256 oldMax, uint256 newMax);

    // ---- Constructor ----

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _coinCode,
        string memory _fiatPeg,
        string memory _country,
        uint256 _maxSupply,
        address _treasury,
        address _compliance
    ) ERC20(_name, _symbol) {
        coinCode  = _coinCode;
        fiatPeg   = _fiatPeg;
        country   = _country;
        maxSupply = _maxSupply;

        // Treasury gets mint, burn and pause rights
        _grantRole(DEFAULT_ADMIN_ROLE, _treasury);
        _grantRole(MINTER_ROLE,     _treasury);
        _grantRole(BURNER_ROLE,     _treasury);
        _grantRole(PAUSER_ROLE,     _treasury);
        _grantRole(COMPLIANCE_ROLE, _compliance);
    }

    // ---- Overrides ----

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev OZ v5: _update is the single hook for all token movements.
     * Blacklist check is enforced here — replaces the deprecated _beforeTokenTransfer.
     * Mints (from==0) and burns (to==0) skip the respective address check.
     */
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Pausable)
    {
        // AML compliance: block blacklisted senders (skip on mint)
        if (from != address(0)) {
            require(!_blacklisted[from], "MondegaCoin: sender is blacklisted");
        }
        // AML compliance: block blacklisted recipients (skip on burn)
        if (to != address(0)) {
            require(!_blacklisted[to], "MondegaCoin: recipient is blacklisted");
        }
        super._update(from, to, value);
    }

    // ---- Compliance ----

    function blacklist(address account, string calldata reason)
        external onlyRole(COMPLIANCE_ROLE)
    {
        require(account != address(0), "Cannot blacklist zero address");
        _blacklisted[account] = true;
        emit Blacklisted(account, msg.sender, reason);
    }

    function unblacklist(address account)
        external onlyRole(COMPLIANCE_ROLE)
    {
        _blacklisted[account] = false;
        emit Unblacklisted(account, msg.sender);
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    // ---- Mint / Burn (Treasury only) ----

    /**
     * @dev Mint new coins when a user buys with fiat.
     * @param to       Recipient wallet address
     * @param amount   Amount in coin units (2 decimals)
     * @param txRef Transaction reference for audit trail
     */
    function mint(address to, uint256 amount, string calldata txRef)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be positive");
        require(
            maxSupply == 0 || totalSupply() + amount <= maxSupply,
            "Would exceed max supply"
        );
        _mint(to, amount);
        emit Minted(to, amount, txRef);
    }

    /**
     * @dev Burn coins when a user sells for fiat.
     * @param from     Address to burn from
     * @param amount   Amount to burn
     * @param txRef Transaction reference
     */
    function burnFrom(address from, uint256 amount, string calldata txRef)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");
        _burn(from, amount);
        emit Burned(from, amount, txRef);
    }

    // ---- Emergency Controls ----

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function updateMaxSupply(uint256 newMax)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newMax == 0 || newMax >= totalSupply(), "Cannot set below current supply");
        emit MaxSupplyUpdated(maxSupply, newMax);
        maxSupply = newMax;
    }
}

// ============================================================
// MONDEGA FACTORY — Deploys and tracks all digital coins
// ============================================================

contract MondegaFactory is AccessControl {

    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    // coin code => contract address
    mapping(string => address) public coins;
    string[] public coinList;

    event CoinDeployed(
        string indexed code,
        address indexed contractAddress,
        string name,
        string fiatPeg,
        string country
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DEPLOYER_ROLE, admin);
    }

    /**
     * @dev Deploy a new digital coin contract
     */
    function deployCoin(
        string calldata name,
        string calldata symbol,
        string calldata code,
        string calldata fiatPeg,
        string calldata country,
        uint256 maxSupply,
        address treasury,
        address compliance
    ) external onlyRole(DEPLOYER_ROLE) returns (address) {
        require(coins[code] == address(0), "Coin already deployed");
        require(treasury != address(0), "Invalid treasury address");

        MondegaCoin coin = new MondegaCoin(
            name, symbol, code, fiatPeg, country,
            maxSupply, treasury, compliance
        );

        coins[code] = address(coin);
        coinList.push(code);

        emit CoinDeployed(code, address(coin), name, fiatPeg, country);

        return address(coin);
    }

    function getCoin(string calldata code) external view returns (address) {
        address addr = coins[code];
        require(addr != address(0), "Coin not found");
        return addr;
    }

    function getAllCoins() external view returns (string[] memory, address[] memory) {
        address[] memory addrs = new address[](coinList.length);
        for (uint i = 0; i < coinList.length; i++) {
            addrs[i] = coins[coinList[i]];
        }
        return (coinList, addrs);
    }
}
