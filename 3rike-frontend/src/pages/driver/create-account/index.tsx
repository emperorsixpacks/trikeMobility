import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from "react-router-dom";
import pin from "@/assets/pin.svg";
import back from "@/assets/back.svg";
import warning from "@/assets/warning.svg";
import { useState, useEffect } from "react";
import { EyeClosed, EyeIcon } from "lucide-react";
import { PinInput } from "@/components/ui/pinInput";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import MobileFrame from "@/components/ui/mobile-frame";

// Backend-required fields are email + password + role. The other fields
// (name, phone, PIN) are collected here for UX but only persisted locally
// for now — they'll be sent to /api/drivers in Phase 2 when we wire the
// driver-profile-creation flow.
//
// Email is REQUIRED here even though the original UX marked it optional —
// the backend treats it as the primary identifier.
const formSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    phone: z.string().min(11, { message: "Please enter a valid phone number" }),
    email: z.string().email({ message: "Enter a valid email" }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    pin: z
        .string()
        .regex(/^\d{4}$/, { message: "PIN must be 4 digits" }),

    confirmPin: z
        .string()
        .regex(/^\d{4}$/, { message: "PIN must be 4 digits" }),
}).refine((data) => data.pin === data.confirmPin, {
    path: ["confirmPin"],
    message: "PINs do not match",
});

const PENDING_PROFILE_KEY = "3rike.pendingDriverProfile";

export default function CreateAccountForm() {
    const [currentTab, setCurrentTab] = useState(0);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = (searchParams.get("role") === "investor" ? "investor" : "driver") as "driver" | "investor";
    const { register: registerUser, isAuthenticated, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(user.role === "investor" ? "/investor" : "/driver", { replace: true });
        }
    }, [isAuthenticated, user, navigate]);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
            pin: "",
            confirmPin: "",
        },
    });
    const { errors } = form.formState;

    // Check if Tab 0 fields are valid
    const isTab0Valid = () => {
        const values = form.getValues();
        return (
            values.firstName.trim().length > 0 &&
            values.lastName.trim().length > 0 &&
            values.phone.length >= 11 &&
            !errors.firstName &&
            !errors.lastName &&
            !errors.phone &&
            !errors.email &&
            !errors.password
        );
    };

    // Check if Tab 1 fields are valid
    const isTab1Valid = () => {
        const values = form.getValues();
        return (
            values.pin.length === 4 &&
            values.confirmPin.length === 4 &&
            values.pin === values.confirmPin &&
            !errors.pin &&
            !errors.confirmPin
        );
    };

    const handleDone = async () => {
        const isValid = await form.trigger(["pin", "confirmPin"]);
        if (isValid) {
            form.handleSubmit(onSubmit)();
        }
    };

    // Validate Tab 0 fields before proceeding
    const handleNextTab = async () => {
        const isValid = await form.trigger(['firstName', 'lastName', 'phone', 'email', 'password']);
        if (isValid) {
            setCurrentTab(1);
        }
    };


    async function onSubmit(data: z.infer<typeof formSchema>) {
        setServerError(null);
        setLoading(true);
        try {
            // Stash the local-only profile fields (name, phone, PIN). Phase 2
            // will pick these up on the dashboard / KYC page and POST them to
            // /api/drivers + payment-PIN setup.
            localStorage.setItem(
                PENDING_PROFILE_KEY,
                JSON.stringify({
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    phone: data.phone.trim(),
                    pin: data.pin,
                }),
            );

            await registerUser(
                data.email.trim().toLowerCase(),
                data.password,
                role,
                {
                    fullName: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
                    phone: data.phone.trim(),
                    pin: data.pin,
                },
            );
            navigate(role === "investor" ? "/investor" : "/driver", { replace: true });
        } catch (err) {
            setServerError(messageFor(err));
        } finally {
            setLoading(false);
        }
    }




    return (
        <MobileFrame innerClassName="overflow-y-auto p-6">
            <div className="bg-white">
                {/* Back Button */}


                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>

                        {/* Rider Info Tab */}
                        {currentTab === 0 && (
                            <div className="space-y-6 ">
                                <div className="relative flex items-center pt-10">
                                    {/* Back button */}
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="pt-10 absolute left-0 top-1/2 -translate-y-1/2"
                                    >
                                        <img src={back} alt="Back" className="w-6 h-6" />
                                    </button>

                                    {/* Centered title */}
                                    <p className="mx-auto font-extrabold text-xl text-center">
                                        Create account
                                    </p>
                                </div>


                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="First Name"
                                                    {...field}
                                                    className="border border-gray-300 w-full h-12"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Last Name"
                                                    {...field}
                                                    className="border border-gray-300 w-full h-12"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    autoComplete="email"
                                                    placeholder="Email"
                                                    {...field}
                                                    className="border border-gray-300 w-full h-12"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Phone Number"
                                                    {...field}
                                                    className="border border-gray-300 w-full h-12"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative w-full">
                                                    <Input {...field} type={showPassword ? "text" : "password"} placeholder="Enter password" className="border border-gray-300 w-full pr-24 h-12" />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                                    >
                                                        {showPassword ? (
                                                            <EyeIcon className="w-6 h-6" />

                                                        ) : (
                                                            <EyeClosed className="w-6 h-6" />
                                                        )}
                                                    </Button>
                                                </div>

                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="button"
                                    disabled={!isTab0Valid()}
                                    onClick={handleNextTab}
                                    className={`
                                        mt-20 w-full rounded-md py-6 transition
                                        ${isTab0Valid()
                                            ? "bg-[#01C259] hover:bg-[#019f4a]"
                                            : "bg-[#7BCD8A] cursor-not-allowed"}
                                    `}
                                >
                                    {isTab0Valid() ? "Next" : "Create Account"}
                                </Button>

                                <div className="text-center text-sm pb-5">
                                    Already have an account?{" "}
                                    <a href="/login" className="text-[#01C259] font-extrabold">
                                        Log in
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Password Tab */}
                        {currentTab === 1 && (
                            <div className="space-y-6">
                                <div className="flex flex-col space-y-4 pt-10">
                                    <div className="flex flex-row space-x-3">
                                        <button onClick={() => setCurrentTab(currentTab - 1)} className="top-4 left-4">
                                            <img src={back} alt="Back" className="w-6 h-6" />
                                        </button>
                                        <h1 className="font-light text-sm">Back</h1>
                                    </div>
                                    <div className="flex flex-row space-x-3">
                                        <img src={pin} alt="pin" className="w-10 h-10" />
                                        <h1 className="font-extrabold flex flex-col justify-center">Create Your Pin</h1>
                                    </div>

                                </div>
                                <FormField
                                    control={form.control}
                                    name="pin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <label className="text-sm text-gray-500 mb-2 block">
                                                Enter your 4-digit pin
                                            </label>

                                            <div className="flex items-center gap-3">
                                                <PinInput
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    show={showPin}
                                                />

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowPin(!showPin)}

                                                >
                                                    {showPin ? (
                                                        <EyeIcon className="w-6 h-6" />

                                                    ) : (
                                                        <EyeClosed className="w-6 h-6" />
                                                    )}
                                                </Button>
                                            </div>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPin"
                                    render={({ field }) => (
                                        <FormItem className="mt-6">
                                            <label className="text-sm text-gray-500 mb-2 block">
                                                Enter your 4-digit pin
                                            </label>

                                            <div className="flex items-center gap-3">
                                                <PinInput
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    show={showPin}
                                                />

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowPin(!showPin)}

                                                >
                                                    {showPin ? (
                                                        <EyeIcon className="w-6 h-6" />

                                                    ) : (
                                                        <EyeClosed className="w-6 h-6" />
                                                    )}
                                                </Button>
                                            </div>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="
                                                mt-6
                                                rounded-xl
                                                border border-dotted border-[#F8D7AB]
                                                bg-[#FDF5EA]
                                                p-4
                                                ">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-row space-x-2">
                                            <img src={warning} alt="Warning" className="w-6 h-6" />
                                            <h1 className="text-md text-[#EE9C2E]">
                                                Security tip
                                            </h1>
                                        </div>

                                        <p className="text-sm text-[#EE9C2E]">
                                            Never share your PIN with anyone, including support.
                                            Always use a strong, unique PIN and keep your device secure
                                            to protect your personal information.
                                        </p>
                                    </div>
                                </div>


                                {serverError && (
                                    <p className="text-sm text-red-500 text-center" role="alert">
                                        {serverError}
                                    </p>
                                )}

                                <Button
                                    className={`
                                        w-full py-6 rounded-md transition mt-20 cursor-pointer
                                        ${isTab1Valid()
                                            ? "bg-[#01C259] hover:bg-[#019f4a]"
                                            : "bg-[#7BCD8A] cursor-not-allowed"}
                                    `}
                                    type="button"
                                    disabled={!isTab1Valid() || loading}
                                    onClick={handleDone}
                                    loading={loading}
                                >
                                    {loading ? "Creating account…" : "Confirm"}
                                </Button>

                                <div className="text-center text-sm pb-5">
                                    Already have an account?{" "}
                                    <a href="/login" className="text-[#01C259] font-extrabold">
                                        Log in
                                    </a>
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </div>
        </MobileFrame>
    );
};

function messageFor(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.code === "timeout") return "The server is waking up — please try again in a moment.";
        if (err.code === "network_error") return "Couldn't reach the server. Check your connection.";
        if (err.code === "email_taken") return "A user with this email already exists.";
        if (err.code === "phone_taken") return "A user with this phone number already exists.";
        return "Something went wrong creating your account. Please try again.";
    }
    return "Something went wrong creating your account. Please try again.";
}