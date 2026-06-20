import { useState, useEffect } from "react";
import {
    Form,
    FormField,
    FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    X,
    Check,
    ChevronRight,
    User,
    Landmark,
} from "lucide-react";
import MobileFrame from "@/components/ui/mobile-frame";

// --- Zod Schemas ---
const recipientSchema = z.object({
    accountNumber: z.string().min(10, "Must be 10 digits").max(10),
});

const amountSchema = z.object({
    amount: z.string().min(1, "Enter amount"),
    remark: z.string().optional(),
});

type Step = 'summary' | 'manage' | 'recipient' | 'amount' | 'confirm' | 'pin' | 'success';

export default function WithdrawSendMoney() {
    const navigate = useNavigate();

    // --- State Management ---
    const [step, setStep] = useState<Step>('summary');
    const [recipientData, setRecipientData] = useState<{ name: string, bank: string } | null>(null);
    const [transferData, setTransferData] = useState<{ amount: string, remark: string } | null>(null);

    // Toggle for "Insufficient Funds" simulation
    const [hasFunds, _setHasFunds] = useState(true);

    // PIN State
    const [pin, setPin] = useState("");

    // --- Mock Linked Data ---
    const [linkedAccount] = useState({
        bankName: "MoMo PSB",
        accountNumber: "8102910839",
        accountName: "Effiong Musa"
    });

    // --- Forms ---
    const recipientForm = useForm<z.infer<typeof recipientSchema>>({
        resolver: zodResolver(recipientSchema),
        defaultValues: { accountNumber: "" }
    });

    const amountForm = useForm<z.infer<typeof amountSchema>>({
        resolver: zodResolver(amountSchema),
        defaultValues: { amount: "", remark: "" }
    });

    // --- Logic: Step 0 (Summary Actions) ---
    const handleWithdrawToLinked = () => {
        recipientForm.setValue("accountNumber", linkedAccount.accountNumber);
        setRecipientData({
            name: linkedAccount.accountName,
            bank: linkedAccount.bankName
        });
        setStep('amount');
    };

    const handleManageAccount = () => {
        setStep('manage');
    };
    
    const handleSendToOther = () => {
        recipientForm.reset();
        setRecipientData(null);
        setStep('recipient');
    };

    const handleClose = () => {
        navigate('/driver');
    };

    // --- Logic: Step 1 (Recipient) ---
    const watchedAccountNumber = recipientForm.watch("accountNumber");

    useEffect(() => {
        if (step === 'recipient' && watchedAccountNumber?.length === 10) {
            setTimeout(() => {
                setRecipientData({ name: "Ndukwe Anita Nwakaego", bank: "MoMo" });
            }, 500);
        } else if (step === 'recipient') {
            setRecipientData(null);
        }
    }, [watchedAccountNumber, step]);

    const onRecipientSubmit = (_data: z.infer<typeof recipientSchema>) => {
        if (recipientData) setStep('amount');
    };

    // --- Logic: Step 2 (Amount) ---
    const onAmountSubmit = (data: z.infer<typeof amountSchema>) => {
        setTransferData({ amount: data.amount, remark: data.remark || "" });
        setStep('confirm');
    };

    const setPresetAmount = (val: string) => {
        amountForm.setValue("amount", val);
    };

    // --- Logic: Final Submission ---
    const handleFinalSubmit = (finalPin: string) => {
        const payload = {
            recipientAccount: recipientForm.getValues("accountNumber"),
            recipientName: recipientData?.name,
            recipientBank: recipientData?.bank,
            amount: transferData?.amount,
            remark: transferData?.remark,
            pin: finalPin,
            timestamp: new Date().toISOString()
        };
        console.log("FINAL FORM SUBMISSION PAYLOAD:", payload);
        setTimeout(() => {
            setStep('success');
        }, 300);
    };

    // --- Logic: Step 4 (PIN Keypad) ---
    const handlePinPress = (num: string) => {
        if (num === "x") {
            setPin(prev => prev.slice(0, -1));
        } else if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                handleFinalSubmit(newPin);
            }
        }
    };

    const handleAmountBack = () => {
        if (recipientForm.getValues("accountNumber") === linkedAccount.accountNumber) {
            setStep('summary');
        } else {
            setStep('recipient');
        }
    };

    // --- Reusable Component: Optimized Account Info Block ---
    // This matches your requested flex layout exactly
    const OptimizedAccountDetails = ({ showDelete = false }: { showDelete?: boolean }) => (
        <div className="text-right flex flex-row items-center justify-end">
            <div>
                <p className="text-[#9747FF] font-medium text-sm tracking-wide">
                    {linkedAccount.accountNumber}
                </p>
                <p className="text-[#667085] text-xs font-medium mt-0.5">
                    {linkedAccount.bankName}
                </p>
                <p className="text-[#9747FF] text-sm font-medium mt-0.5">
                    {linkedAccount.accountName}
                </p>
            </div>

            {showDelete && (
                <div 
                    className="items-center ml-3 -mr-2 p-1 cursor-pointer hover:bg-red-50 rounded-full"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Add delete logic here
                        console.log("Delete clicked");
                    }}
                >
                    <img src="/red-minus.svg" alt="Remove" className="w-5 h-5" />
                </div>
            )}
        </div>
    );

    return (
        <MobileFrame>
        <div className="absolute inset-0 z-50 flex items-end justify-center">

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300" onClick={handleClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl overflow-hidden min-h-150 flex flex-col">

                {/* --- Close 'X' Button (Top Right) --- */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-5 right-5 z-50 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* --- Handle Bar (Slide Down Trigger) --- */}
                {step !== 'success' && (
                    <div 
                        className="pt-3 pb-2 flex justify-center w-full cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        onClick={handleClose} // Clicking the handle area closes/navigates to driver
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                    </div>
                )}

                {/* ============================================================
                    STEP 0: SUMMARY (Linked Account Landing)
                   ============================================================ */}
                {step === 'summary' && (
                    <div className="flex flex-col items-center pt-4 px-6 bg-white w-full max-w-md mx-auto rounded-3xl animate-in slide-in-from-bottom duration-300">

                        {/* Header Icon */}
                        <div className="w-20 h-20 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-4">
                            <Landmark className="w-8 h-8 text-[#A855F7]" />
                        </div>

                        {/* Title & Subtitle */}
                        <h1 className="text-2xl font-bold text-black mb-1">Bank details</h1>
                        <button onClick={handleManageAccount} className="text-[#00C259] font-medium underline text-sm mb-8 hover:text-[#00a34b] transition-colors">
                            Manage Bank Accounts
                        </button>

                        {/* Linked Account Card */}
                        <div className="w-full relative">
                            {/* 'Linked' Badge */}
                            <div className="absolute -top-3 right-16 bg-[#E7F9EE] text-[#00C259] text-[10px] font-bold px-3 py-0.5 rounded-full z-10 border border-white">
                                Linked
                            </div>

                            {/* Card */}
                            <div 
                                onClick={handleWithdrawToLinked} 
                                className="w-full bg-[#F9FAFB] border-2 border-dashed border-[#9747FF] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#F3F5F9] transition-colors"
                            >
                                {/* Left: Logo */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-white">
                                    <img src="/momo.svg" alt="MoMo" className="w-8 h-8 object-contain" />
                                </div>

                                {/* Right: Optimized Details */}
                                <OptimizedAccountDetails showDelete={false} />
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div onClick={handleSendToOther} className="w-full mt-6">
                            <div className="w-full flex justify-end pb-2 cursor-pointer transition-colors group">
                                <span className="text-gray-400 underline text-sm group-hover:text-gray-600">
                                    Send to Another Account
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================
                    MANAGE SCREEN
                   ============================================================ */}
                {step === 'manage' && (
                    <div className="flex flex-col items-center pt-4 px-6 bg-white w-full max-w-md mx-auto rounded-3xl animate-in slide-in-from-right duration-300">
                        <div className="absolute left-4 top-14 z-10">
                            <button onClick={() => setStep('summary')} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        
                        {/* Header Icon */}
                        <div className="w-20 h-20 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-4">
                            <Landmark className="w-8 h-8 text-[#A855F7]" />
                        </div>

                        <h1 className="text-2xl font-bold text-black mb-1">Bank details</h1>

                        <span className="text-[#00C259] font-medium underline text-sm mb-8">
                            Manage Bank Accounts
                        </span>

                        <div className="w-full text-left mb-1">
                             <span className="text-gray-400 text-xs">
                                Here are your saved bank accounts
                            </span>
                        </div>
                       
                        {/* Account List Card */}
                        <div className="w-full relative">
                            <div className="w-full bg-[#F9FAFB] border-2 border-dashed border-[#9747FF] rounded-2xl p-4 flex items-center justify-between cursor-pointer">
                                {/* Left: Logo */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-white">
                                    <img src="/momo.svg" alt="MoMo" className="w-8 h-8 object-contain" />
                                </div>

                                {/* Right: Optimized Details WITH Delete Button */}
                                <OptimizedAccountDetails showDelete={true} />
                            </div>
                        </div>

                        {/* Add New Button */}
                        <div onClick={handleSendToOther} className="w-full mt-6">
                            <Button className="bg-[#F0F2F5] hover:bg-[#E4E7EB] text-black w-full py-7 font-normal rounded-2xl flex gap-2 shadow-none border border-gray-100">
                                <img src="/add_account.svg" alt="" className="w-5 h-5 opacity-60" />
                                Add New Account
                            </Button>
                        </div>
                    </div>
                )}

                {/* ============================================================
                    STEP 1: RECIPIENT ACCOUNT (Manual Entry)
                   ============================================================ */}
                {step === 'recipient' && (
                    <div className="px-6 pt-4 animate-in slide-in-from-right">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setStep('summary')} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-xl font-bold">Recipient Account</h1>
                        </div>

                        <div className="bg-gray-100/80 rounded-2xl p-4 mb-6">
                            <Form {...recipientForm}>
                                <form onSubmit={recipientForm.handleSubmit(onRecipientSubmit)}>
                                    <FormField
                                        control={recipientForm.control}
                                        name="accountNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="relative border-b border-gray-300 pb-1 mb-4">
                                                    <Input
                                                        placeholder="Enter the 10 digit number"
                                                        className="border-0 bg-transparent text-lg p-0 placeholder:text-gray-400 focus-visible:ring-0 shadow-none rounded-none"
                                                        maxLength={10}
                                                        type="tel"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-between items-center py-3 border-b border-gray-200 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            {recipientData?.bank === 'MoMo' && <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center p-0.5"><img src="/momo.svg" alt="" className="w-full h-full object-contain" /></div>}
                                            <span className="text-gray-500 text-sm">{recipientData ? recipientData.bank : "Select Bank"}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>

                                    {recipientData && (
                                        <div className="mt-4 bg-[#D1FADF] rounded-lg p-3 flex items-center gap-2 animate-in fade-in">
                                            <div className="w-5 h-5 bg-[#12B76A] rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-[#027A48] text-sm font-semibold">{recipientData.name}</span>
                                        </div>
                                    )}
                                </form>
                            </Form>
                        </div>

                        <Button
                            onClick={recipientForm.handleSubmit(onRecipientSubmit)}
                            disabled={!recipientData}
                            className={`w-full py-6 rounded-xl text-lg font-medium transition-colors ${recipientData ? 'bg-[#01C259] hover:bg-[#019f4a]' : 'bg-[#86efac]'}`}
                        >
                            Next
                        </Button>
                    </div>
                )}

                {/* ============================================================
                    STEP 2: AMOUNT & REMARK
                   ============================================================ */}
                {step === 'amount' && (
                    <div className="px-6 pt-2 animate-in slide-in-from-right">
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={handleAmountBack} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <h2 className="text-lg font-bold">Transfer to Bank</h2>
                        </div>

                        <div className="bg-gray-100/80 rounded-xl p-4 flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{recipientData?.name}</h3>
                                <p className="text-xs text-gray-500">{recipientForm.getValues("accountNumber")}</p>
                            </div>
                        </div>

                        <Form {...amountForm}>
                            <form onSubmit={amountForm.handleSubmit(onAmountSubmit)}>
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-black ml-1">Amount</label>
                                    <FormField
                                        control={amountForm.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="relative border-b border-[#01C259] py-2">
                                                    <span className="absolute left-0 top-3 text-xl text-gray-400 font-light">₵</span>
                                                    <Input
                                                        className="border-0 bg-transparent text-xl ml-8 p-0 focus-visible:ring-0 shadow-none rounded-none"
                                                        type="number"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
                                        {['10', '200', '1000', '2000'].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setPresetAmount(amt)}
                                                className="px-4 py-2 bg-gray-100 hover:bg-[#E8FBF0] hover:text-[#01C259] rounded-lg text-sm font-medium transition whitespace-nowrap"
                                            >
                                                ₵ {amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="text-sm font-bold text-black ml-1">Remark</label>
                                    <FormField
                                        control={amountForm.control}
                                        name="remark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="border-b border-[#01C259] py-2">
                                                    <Input
                                                        placeholder="What is the money for"
                                                        className="border-0 bg-transparent text-sm p-0 placeholder:text-gray-400 focus-visible:ring-0 shadow-none rounded-none"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" className="w-full py-6 bg-[#01C259] hover:bg-[#019f4a] rounded-xl text-lg font-medium">
                                    Next
                                </Button>
                            </form>
                        </Form>
                    </div>
                )}

                {/* ============================================================
                    STEP 3: CONFIRMATION
                   ============================================================ */}
                {step === 'confirm' && (
                    <div className="px-6 pt-4 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-start mb-4">
                            <button onClick={() => setStep('amount')} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center text-3xl font-extrabold text-black">
                                <span className="text-gray-400 mr-1 font-light">₵</span>
                                {Math.round(parseFloat(transferData?.amount || "0"))}
                            </div>
                        </div>

                        <div className="space-y-6 text-sm mb-12">
                            <div className="flex justify-between">
                                <span className="text-gray-400 italic">Bank</span>
                                <span className="font-medium">{recipientData?.bank}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 italic">Account Number</span>
                                <span className="font-medium">{recipientForm.getValues("accountNumber")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 italic">Name</span>
                                <span className="font-medium">{recipientData?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 italic">Amount</span>
                                <span className="font-medium">₵ {transferData?.amount}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 italic">Account Balance ₵ 6000</span>
                                {hasFunds ? (
                                    <Check className="w-5 h-5 text-[#01C259]" />
                                ) : (
                                    <span className="text-red-500 text-xs font-medium">Insufficient Funds</span>
                                )}
                            </div>
                        </div>

                        <Button
                            onClick={() => hasFunds && setStep('pin')}
                            disabled={!hasFunds}
                            className={`w-full py-6 rounded-xl text-lg font-medium transition
                                ${hasFunds ? 'bg-[#01C259] hover:bg-[#019f4a]' : 'bg-[#01C259] opacity-50 cursor-not-allowed'}
                            `}
                        >
                            Pay
                        </Button>
                    </div>
                )}

                {/* ============================================================
                    STEP 4: PIN INPUT
                   ============================================================ */}
                {step === 'pin' && (
                    <div className="flex flex-col h-full animate-in slide-in-from-bottom">
                        <div className="px-6 pt-6 mb-10">
                            <button onClick={() => setStep('confirm')} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col items-center px-6">
                            <h2 className="text-lg font-bold mb-8">Enter your pin</h2>

                            <div className="flex gap-4 mb-12">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all
                                            ${pin.length > i ? 'border-gray-400' : 'border-gray-200'}
                                        `}
                                    >
                                        {pin.length > i && <div className="w-3 h-3 bg-gray-600 rounded-full" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 pb-8 rounded-t-[32px]">
                            <div className="flex justify-between px-4 mb-4 text-[10px] text-gray-500 font-semibold">
                                <span>3rike Secure Numeric Keypad</span>
                                <span className="text-green-500 cursor-pointer" onClick={() => handleFinalSubmit(pin)}>Done</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinPress(num.toString())}
                                        className="h-14 bg-white rounded-lg shadow-sm text-xl font-bold text-black active:bg-gray-100"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePinPress("0")}
                                    className="h-14 bg-white rounded-lg shadow-sm text-xl font-bold text-black col-start-2 active:bg-gray-100"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => handlePinPress("x")}
                                    className="h-14 bg-white rounded-lg shadow-sm flex items-center justify-center active:bg-gray-100"
                                >
                                    <span className="text-lg font-medium lowercase">x</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================
                    STEP 5: SUCCESS
                   ============================================================ */}
                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center h-full px-6 pt-20 pb-10 animate-in zoom-in-95 duration-300">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 bg-[#01C259] rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-white" strokeWidth={4} />
                            </div>
                        </div>

                        <h2 className="text-[#01C259] font-medium text-lg mb-2">Successful</h2>

                        <div className="flex items-center text-3xl font-extrabold text-black mb-20">
                            <span className="text-gray-400 mr-1 font-light">₵</span>
                            {Math.round(parseFloat(transferData?.amount || "0"))}
                        </div>

                        <Button
                            onClick={() => navigate("/driver")}
                            className="w-full py-6 bg-[#01C259] hover:bg-[#019f4a] rounded-xl text-lg font-medium mt-auto"
                        >
                            Done
                        </Button>
                    </div>
                )}
            </div>
        </div>
        </MobileFrame>
    );
}