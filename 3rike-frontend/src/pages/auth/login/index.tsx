import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { EyeClosed, EyeIcon } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import MobileFrame from "@/components/ui/mobile-frame";

const formSchema = z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(user.role === "investor" ? "/investor" : "/driver", { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(data: FormValues) {
        setServerError(null);
        setLoading(true);
        try {
            const user = await login(data.email.trim().toLowerCase(), data.password);
            // Send the user back where they tried to go, or to their dashboard.
            const from = (location.state as { from?: string } | null)?.from;
            if (from && from.startsWith("/")) {
                navigate(from, { replace: true });
                return;
            }
            navigate(user.role === "investor" ? "/investor" : "/driver", { replace: true });
        } catch (err) {
            setServerError(messageFor(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <MobileFrame innerClassName="overflow-y-auto p-6 pt-15">
            <div className="bg-white">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="pt-10 pb-2 text-center">
                            <h1 className="font-extrabold text-2xl">Welcome back</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Sign in to continue
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="Email address"
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
                                            <Input
                                                {...field}
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                placeholder="Password"
                                                className="border border-gray-300 w-full pr-12 h-12"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowPassword((v) => !v)}
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

                        {serverError && (
                            <p className="text-sm text-red-500 text-center" role="alert">
                                {serverError}
                            </p>
                        )}

                        <div className="text-end text-sm">
                            <Link to="/forgot-password-phone" className="text-gray-400 font-light">
                                Forgot password
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !form.formState.isValid}
                            loading={loading}
                            className={`
                                w-full py-6 rounded-md transition cursor-pointer
                                ${form.formState.isValid
                                    ? "bg-[#01C259] hover:bg-[#019f4a]"
                                    : "bg-[#7BCD8A] cursor-not-allowed"}
                            `}
                        >
                            {loading ? "Signing in…" : "Sign in"}
                        </Button>

                        <div className="text-center text-sm pb-5">
                            New to 3rike?{" "}
                            <Link
                                to="/role-select"
                                className="text-[#01C259] font-extrabold"
                            >
                                Create an account
                            </Link>
                        </div>
                    </form>
                </Form>
            </div>
        </MobileFrame>
    );
}

function messageFor(err: unknown): string {
    if (err instanceof ApiError) {
        switch (err.code) {
            case "timeout":
                return "The server is waking up — please try again in a moment.";
            case "network_error":
                return "Couldn't reach the server. Check your connection.";
            default:
                if (err.status === 401) return "Wrong email or password.";
                return "Something went wrong. Please try again.";
        }
    }
    return "Something went wrong. Please try again.";
}
