// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract LendingPlatform {
    address public owner;
    uint public interestRate = 10; // 10% interest

    struct Loan {
        uint collateralAmount;
        uint loanAmount;
        bool isRepaid;
    }

    mapping(address => uint) public lenderBalances;
    mapping(address => Loan) public borrowerLoans;

    constructor() {
        owner = msg.sender;
    }

    // Lender deposits ETH
    function deposit() external payable {
        require(msg.value > 0, "Must deposit more than 0");
        lenderBalances[msg.sender] += msg.value;
    }

    // Borrower deposits collateral and borrows ETH
    function borrow() external payable {
        require(msg.value > 0, "Must provide collateral");
        require(address(this).balance >= msg.value / 2, "Not enough liquidity");

        uint loanAmount = msg.value / 2; // 50% LTV
        borrowerLoans[msg.sender] = Loan({
            collateralAmount: msg.value,
            loanAmount: loanAmount,
            isRepaid: false
        });

        payable(msg.sender).transfer(loanAmount);
    }

    // Repay the loan with interest
    function repay() external payable {
        Loan storage loan = borrowerLoans[msg.sender];
        require(!loan.isRepaid, "Already repaid");

        uint amountDue = loan.loanAmount + (loan.loanAmount * interestRate / 100);
        require(msg.value >= amountDue, "Not enough to repay loan");

        loan.isRepaid = true;
    }

    // Withdraw collateral after repayment
    function withdrawCollateral() external {
        Loan storage loan = borrowerLoans[msg.sender];
        require(loan.isRepaid, "Loan not repaid yet");
        require(loan.collateralAmount > 0, "No collateral to withdraw");

        uint amount = loan.collateralAmount;
        loan.collateralAmount = 0;

        payable(msg.sender).transfer(amount);
    }

    // Check contract balance (for testing)
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }
}
