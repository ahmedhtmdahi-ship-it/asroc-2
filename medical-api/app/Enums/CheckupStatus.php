<?php

namespace App\Enums;

enum CheckupStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
    case Postponed = 'postponed';
    case CheckedOut = 'checked_out';
    case InDiagnosis = 'in_diagnosis';
    case Prescribed = 'prescribed';
    case Dispensed = 'dispensed';
    case Returned = 'returned';
    case Completed = 'completed';
}
