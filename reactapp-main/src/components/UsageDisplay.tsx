import { useState, useEffect } from 'react';
import { AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usageService, UsageData } from '@/lib/usage-service';
import Swal from 'sweetalert2';

interface UsageDisplayProps {
    onUpgradeClick?: () => void;
    compact?: boolean;
    showUpgradeButton?: boolean;
    usage?: UsageData | null; // Accept usage from parent to show real-time updates
}

const UsageDisplay = ({ 
    onUpgradeClick, 
    compact = false,
    showUpgradeButton = true,
    usage: externalUsage
}: UsageDisplayProps) => {
    const [internalUsage, setInternalUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    // Use external usage if provided, otherwise use internal
    const usage = externalUsage !== undefined ? externalUsage : internalUsage;

    useEffect(() => {
        // Only load usage if not provided externally
        if (externalUsage === undefined) {
            loadUsage();
            
            // Set up auto-refresh every 10 seconds for real-time updates
            const interval = setInterval(loadUsage, 10000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [externalUsage]);

    const loadUsage = async () => {
        try {
            const data = await usageService.getUsage();
            setInternalUsage(data);
        } catch (error) {
            console.error('Failed to load usage:', error);
            // Silently fail - don't show error popup
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-gray-800 bg-[#0f0f0f]">
                <CardContent className="p-4">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                        <div className="h-2 bg-gray-800 rounded w-full"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!usage) {
        // If usage failed to load, still show upgrade button
        if (compact && showUpgradeButton && onUpgradeClick) {
            return (
                <Card className="border-gray-800 bg-[#0f0f0f]">
                    <CardContent className="p-3">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Free Plan</p>
                            <Button
                                onClick={onUpgradeClick}
                                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                                size="sm"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Upgrade Plan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    const isUnlimited = usage.limit === 'unlimited';
    const percentage = usageService.getUsagePercentage(usage);
    const isNearLimit = usageService.isNearLimit(usage);
    const isOverLimit = usageService.isOverLimit(usage);

    // Compact version for sidebar or small spaces
    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">API Usage</span>
                    <span className={`font-semibold ${
                        isOverLimit ? 'text-red-500' :
                        isNearLimit ? 'text-yellow-500' :
                        'text-green-500'
                    }`}>
                        {isUnlimited ? 'Unlimited' : `${usage.remaining}/${usage.limit}`}
                    </span>
                </div>
                {!isUnlimited && (
                    <Progress 
                        value={percentage} 
                        className={`h-1 ${
                            isOverLimit ? 'bg-red-900' :
                            isNearLimit ? 'bg-yellow-900' :
                            'bg-green-900'
                        }`}
                    />
                )}
                {isOverLimit && showUpgradeButton && (
                    <Button
                        onClick={onUpgradeClick}
                        size="sm"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs"
                    >
                        <Zap className="w-3 h-3 mr-1" />
                        Upgrade
                    </Button>
                )}
            </div>
        );
    }

    // Full version
    return (
        <Card className={`border-gray-800 ${
            isOverLimit ? 'bg-red-950/20 border-red-900' :
            isNearLimit ? 'bg-yellow-950/20 border-yellow-900' :
            'bg-[#0f0f0f]'
        }`}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            API Usage
                        </h3>
                        <p className="text-sm text-gray-400 capitalize">
                            Current Plan: <span className="text-orange-500 font-semibold">{usage.plan}</span>
                        </p>
                    </div>
                    {(isOverLimit || isNearLimit) && (
                        <AlertCircle className={`w-6 h-6 ${
                            isOverLimit ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                    )}
                </div>

                <div className="space-y-4">
                    {/* Usage Stats */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                            {usage.current.toLocaleString()}
                        </span>
                        <span className="text-gray-400">
                            {isUnlimited ? 'requests this month' : `/ ${usage.limit.toLocaleString()}`}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    {!isUnlimited && (
                        <div className="space-y-2">
                            <Progress 
                                value={percentage} 
                                className={`h-2 ${
                                    isOverLimit ? 'bg-red-900' :
                                    isNearLimit ? 'bg-yellow-900' :
                                    'bg-green-900'
                                }`}
                            />
                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${
                                    isOverLimit ? 'text-red-400' :
                                    isNearLimit ? 'text-yellow-400' :
                                    'text-green-400'
                                }`}>
                                    {percentage.toFixed(1)}% used
                                </span>
                                <span className="text-gray-400">
                                    {typeof usage.remaining === 'number' 
                                        ? `${usage.remaining.toLocaleString()} remaining`
                                        : 'Unlimited'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Warning Messages */}
                    {isOverLimit && (
                        <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg">
                            <p className="text-sm text-red-400 font-medium">
                                ⚠️ You've reached your monthly limit
                            </p>
                            <p className="text-xs text-red-300 mt-1">
                                Upgrade your plan to continue using the API.
                            </p>
                        </div>
                    )}

                    {isNearLimit && !isOverLimit && (
                        <div className="p-3 bg-yellow-950/50 border border-yellow-900 rounded-lg">
                            <p className="text-sm text-yellow-400 font-medium">
                                ⚡ Approaching usage limit
                            </p>
                            <p className="text-xs text-yellow-300 mt-1">
                                Consider upgrading to avoid interruptions.
                            </p>
                        </div>
                    )}

                    {/* Upgrade Button */}
                    {showUpgradeButton && !isUnlimited && (
                        <Button
                            onClick={onUpgradeClick}
                            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {isOverLimit ? 'Upgrade Now' : 'Upgrade Plan'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default UsageDisplay;
