import { useState, useEffect } from 'react';
import { X, Zap, Check, Crown, Rocket, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { subscriptionService, PLANS, Plan } from '@/lib/subscription-service';
import { usageService, UsageData } from '@/lib/usage-service';
import Swal from 'sweetalert2';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: string;
    usage?: UsageData;
}

const planIcons = {
    free: Zap,
    starter: Rocket,
    professional: Crown,
    enterprise: Building
};

const UpgradeModal = ({ isOpen, onClose, currentPlan = 'free', usage }: UpgradeModalProps) => {
    const [loading, setLoading] = useState<string | null>(null);
    const [localUsage, setLocalUsage] = useState<UsageData | null>(usage || null);

    useEffect(() => {
        if (isOpen && !localUsage) {
            loadUsage();
        }
    }, [isOpen, localUsage]);

    const loadUsage = async () => {
        try {
            const data = await usageService.getUsage();
            setLocalUsage(data);
        } catch (error) {
            console.error('Failed to load usage:', error);
        }
    };

    const handleUpgrade = async (plan: Plan) => {
        if (plan.id === 'free') return;
        
        setLoading(plan.id);
        
        try {
            const session = await subscriptionService.createCheckoutSession(plan.id);
            
            // Redirect to Stripe Checkout
            window.location.href = session.url;
        } catch (error) {
            console.error('Upgrade error:', error);
            setLoading(null);
            
            const errorMessage = error instanceof Error ? error.message : 'Unable to process upgrade. Please try again.';
            
            // Check if it's a configuration error
            if (errorMessage.includes('not fully configured') || errorMessage.includes('contact support')) {
                Swal.fire({
                    title: 'Stripe Setup Required',
                    html: `
                        <p class="text-gray-300 mb-4">${errorMessage}</p>
                        <p class="text-sm text-gray-400">You can still use the app with usage tracking. Payment processing will be enabled once Stripe products are configured.</p>
                    `,
                    icon: 'info',
                    confirmButtonText: 'Got it',
                    confirmButtonColor: '#f97316',
                    background: '#1a1a1a',
                    color: '#fff',
                    customClass: {
                        popup: 'border border-gray-800',
                        confirmButton: 'font-semibold'
                    }
                });
            } else {
                Swal.fire({
                    title: 'Upgrade Failed',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#f97316',
                    background: '#1a1a1a',
                    color: '#fff',
                    customClass: {
                        popup: 'border border-gray-800',
                        confirmButton: 'font-semibold'
                    }
                });
            }
        }
    };

    const handleManageBilling = async () => {
        try {
            const url = await subscriptionService.getPortalUrl();
            window.location.href = url;
        } catch (error) {
            console.error('Portal error:', error);
            
            Swal.fire({
                title: 'Error',
                text: 'Unable to access billing portal.',
                icon: 'error',
                confirmButtonColor: '#f97316',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-[#0f0f0f] border-b border-gray-800 p-4 sm:p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Choose Your Plan</h2>
                        {localUsage && (
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                Current: <span className="text-orange-500 font-semibold capitalize">{currentPlan}</span> • 
                                Usage: <span className="text-white">{usageService.getUsageDisplay(localUsage)}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Plans Grid */}
                <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {PLANS.map((plan) => {
                            const Icon = planIcons[plan.id];
                            const isCurrent = plan.id === currentPlan;
                            const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);
                            
                            return (
                                <Card
                                    key={plan.id}
                                    className={`relative overflow-hidden transition-all duration-300 ${
                                        isCurrent
                                            ? 'border-orange-500 shadow-lg shadow-orange-500/20 bg-[#1a1a1a]'
                                            : plan.id === 'professional'
                                            ? 'border-orange-500/50 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 bg-[#1a1a1a]'
                                            : 'border-gray-800 hover:border-gray-700 hover:shadow-lg bg-[#0f0f0f]'
                                    }`}
                                >
                                    {isCurrent && (
                                        <Badge className="absolute top-4 right-4 bg-orange-500 text-white text-xs">
                                            Current Plan
                                        </Badge>
                                    )}
                                    
                                    {plan.id === 'professional' && !isCurrent && (
                                        <>
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                                            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-semibold">
                                                ⭐ Recommended
                                            </Badge>
                                        </>
                                    )}

                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${
                                                plan.id === 'free' ? 'bg-gray-800' :
                                                plan.id === 'starter' ? 'bg-blue-500/20' :
                                                plan.id === 'professional' ? 'bg-orange-500/20' :
                                                'bg-purple-500/20'
                                            }`}>
                                                <Icon className={`w-5 h-5 ${
                                                    plan.id === 'free' ? 'text-gray-400' :
                                                    plan.id === 'starter' ? 'text-blue-400' :
                                                    plan.id === 'professional' ? 'text-orange-400' :
                                                    'text-purple-400'
                                                }`} />
                                            </div>
                                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                                ${plan.price}
                                            </span>
                                            <span className="text-gray-400 text-sm">/{plan.interval}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {typeof plan.apiCalls === 'number' 
                                                ? `${plan.apiCalls.toLocaleString()} requests/month`
                                                : 'Unlimited requests'
                                            }
                                        </p>
                                    </CardHeader>

                                    <CardContent>
                                        <ul className="space-y-3 mb-6">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-gray-300">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {isCurrent ? (
                                            <Button
                                                onClick={handleManageBilling}
                                                variant="outline"
                                                className="w-full border-gray-700 text-gray-300"
                                            >
                                                Manage Billing
                                            </Button>
                                        ) : isDowngrade ? (
                                            <Button
                                                variant="outline"
                                                disabled
                                                className="w-full border-gray-800 text-gray-600"
                                            >
                                                Contact Support to Downgrade
                                            </Button>
                                        ) : plan.id === 'free' ? (
                                            <Button
                                                variant="outline"
                                                disabled
                                                className="w-full border-gray-800 text-gray-600"
                                            >
                                                Current Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleUpgrade(plan)}
                                                disabled={loading !== null}
                                                className={`w-full ${
                                                    plan.id === 'professional'
                                                        ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600'
                                                        : 'bg-orange-500 hover:bg-orange-600'
                                                } text-white`}
                                            >
                                                {loading === plan.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    'Upgrade Now'
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-[#0a0a0a] border border-gray-800 rounded-lg">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Frequently Asked Questions</h3>
                        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                            <div>
                                <p className="text-gray-300 font-medium">Can I change plans anytime?</p>
                                <p className="text-gray-400">Yes, you can upgrade or downgrade your plan at any time.</p>
                            </div>
                            <div>
                                <p className="text-gray-300 font-medium">What happens when I reach my limit?</p>
                                <p className="text-gray-400">You'll be prompted to upgrade. Your service won't be interrupted.</p>
                            </div>
                            <div>
                                <p className="text-gray-300 font-medium">Is there a commitment?</p>
                                <p className="text-gray-400">No, all plans are month-to-month. Cancel anytime.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
