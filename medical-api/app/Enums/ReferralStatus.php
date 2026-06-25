<?php

namespace App\Enums;

enum ReferralStatus: string
{
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
